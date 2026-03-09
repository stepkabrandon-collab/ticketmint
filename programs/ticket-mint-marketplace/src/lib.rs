// ============================================================
// Ticket Mint Marketplace — Anchor 0.30 Program
// ============================================================
// Instructions:
//   list_ticket   — seller deposits NFT into PDA escrow, records price
//   buy_ticket    — buyer pays SOL; program pays seller (minus fees),
//                   pays platform fee, pays royalty, transfers NFT
//   cancel_listing — seller reclaims NFT from escrow, closes listing
//
// Fee structure (enforced on-chain):
//   Platform fee : 2.5%  → PLATFORM_FEE_WALLET
//   Royalty      : 2.5%  → royalty_recipient stored in listing
//   Seller nets  : 95%   of listing price
// ============================================================

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("TMktXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

// ── Constants ────────────────────────────────────────────────
/// 2.5% in basis points
const PLATFORM_FEE_BPS: u64 = 250;
/// 2.5% royalty in basis points
const ROYALTY_BPS: u64 = 250;
const BPS_DIVISOR: u64 = 10_000;

// Hardcoded platform fee wallet — replace with your actual wallet.
// In production, store this in a config PDA so it can be updated.
pub mod platform {
    use anchor_lang::prelude::*;
    declare_id!("FEEwXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
}

// ── Program ──────────────────────────────────────────────────
#[program]
pub mod ticket_mint_marketplace {
    use super::*;

    // ────────────────────────────────────────────────────────
    // list_ticket
    //
    // Seller calls this after minting their ticket NFT.
    // The NFT is transferred from the seller's ATA into the
    // escrow ATA (owned by the listing PDA).  A ListingAccount
    // PDA is created to store the price, royalty recipient, etc.
    // ────────────────────────────────────────────────────────
    pub fn list_ticket(
        ctx: Context<ListTicket>,
        price_lamports: u64,
        royalty_recipient: Pubkey,
    ) -> Result<()> {
        require!(price_lamports > 0, MarketplaceError::InvalidPrice);

        // Populate the listing state
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.mint = ctx.accounts.mint.key();
        listing.price_lamports = price_lamports;
        listing.royalty_recipient = royalty_recipient;
        listing.listed_at = Clock::get()?.unix_timestamp;
        listing.bump = ctx.bumps.listing;
        listing.escrow_bump = ctx.bumps.escrow_token_account;

        // Transfer NFT (amount = 1) from seller ATA → escrow ATA
        // The escrow ATA is owned by the listing PDA, preventing
        // the seller from double-listing or transferring elsewhere.
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            1,
        )?;

        emit!(TicketListed {
            listing: listing.key(),
            seller: listing.seller,
            mint: listing.mint,
            price_lamports,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────
    // buy_ticket
    //
    // Buyer sends SOL equal to the listing price.
    // Program distributes:
    //   • seller_net = price × 95%
    //   • platform   = price × 2.5%
    //   • royalty    = price × 2.5%
    // Then transfers the NFT from escrow → buyer ATA.
    // The listing PDA and escrow ATA are closed; rent is
    // returned to the seller.
    // ────────────────────────────────────────────────────────
    pub fn buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        let price = listing.price_lamports;

        // ── Fee math ─────────────────────────────────────
        let platform_fee = price
            .checked_mul(PLATFORM_FEE_BPS)
            .and_then(|v| v.checked_div(BPS_DIVISOR))
            .ok_or(MarketplaceError::ArithmeticOverflow)?;

        let royalty_fee = price
            .checked_mul(ROYALTY_BPS)
            .and_then(|v| v.checked_div(BPS_DIVISOR))
            .ok_or(MarketplaceError::ArithmeticOverflow)?;

        let seller_net = price
            .checked_sub(platform_fee)
            .and_then(|v| v.checked_sub(royalty_fee))
            .ok_or(MarketplaceError::ArithmeticOverflow)?;

        // ── SOL transfers (buyer → recipients) ───────────
        // Buyer → seller (net proceeds)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            seller_net,
        )?;

        // Buyer → platform fee wallet
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.platform_fee_wallet.to_account_info(),
                },
            ),
            platform_fee,
        )?;

        // Buyer → royalty recipient (original creator)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.royalty_recipient.to_account_info(),
                },
            ),
            royalty_fee,
        )?;

        // ── NFT transfer: escrow → buyer ATA ─────────────
        // The escrow ATA is owned by the listing PDA.
        // We derive the PDA signer seeds to authorize the transfer.
        let mint_key = listing.mint;
        let seller_key = listing.seller;
        let bump = listing.bump;

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"listing",
            mint_key.as_ref(),
            seller_key.as_ref(),
            &[bump],
        ]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            ),
            1,
        )?;

        emit!(TicketSold {
            listing: ctx.accounts.listing.key(),
            buyer: ctx.accounts.buyer.key(),
            seller: seller_key,
            mint: mint_key,
            price_lamports: price,
            platform_fee,
            royalty_fee,
            seller_net,
        });

        Ok(())
    }

    // ────────────────────────────────────────────────────────
    // cancel_listing
    //
    // Seller can cancel an active listing at any time.
    // NFT is returned from escrow → seller ATA.
    // Listing PDA and escrow ATA are closed; rent refunded.
    // ────────────────────────────────────────────────────────
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        let mint_key = listing.mint;
        let seller_key = listing.seller;
        let bump = listing.bump;

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"listing",
            mint_key.as_ref(),
            seller_key.as_ref(),
            &[bump],
        ]];

        // Transfer NFT back from escrow → seller
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            ),
            1,
        )?;

        emit!(ListingCancelled {
            listing: ctx.accounts.listing.key(),
            seller: seller_key,
            mint: mint_key,
        });

        Ok(())
    }
}

// ── Account structs ──────────────────────────────────────────

/// Persistent listing state stored in a PDA.
/// Seeds: ["listing", mint, seller]
#[account]
#[derive(Default)]
pub struct ListingAccount {
    /// Seller's wallet pubkey
    pub seller: Pubkey,           // 32
    /// NFT mint address
    pub mint: Pubkey,             // 32
    /// Ask price in lamports
    pub price_lamports: u64,      // 8
    /// Original creator to receive 2.5% royalty
    pub royalty_recipient: Pubkey, // 32
    /// Unix timestamp of listing creation
    pub listed_at: i64,           // 8
    /// Bump seed for this PDA
    pub bump: u8,                 // 1
    /// Bump seed for escrow ATA
    pub escrow_bump: u8,          // 1
}

impl ListingAccount {
    // 8 (discriminator) + 32+32+8+32+8+1+1 = 122
    pub const LEN: usize = 8 + 32 + 32 + 8 + 32 + 8 + 1 + 1;
}

// ── Instruction contexts ─────────────────────────────────────

#[derive(Accounts)]
pub struct ListTicket<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    /// The NFT mint — must be a valid SPL Token mint with supply = 1
    pub mint: Account<'info, Mint>,

    /// Seller's ATA for this mint
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// Listing PDA — created on first list, closed on buy/cancel
    #[account(
        init,
        payer = seller,
        space = ListingAccount::LEN,
        seeds = [b"listing", mint.key().as_ref(), seller.key().as_ref()],
        bump,
    )]
    pub listing: Account<'info, ListingAccount>,

    /// Escrow ATA owned by the listing PDA.
    /// Holding the NFT here prevents the seller from spending it
    /// while it is listed.
    #[account(
        init,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// Seller wallet receives net proceeds
    /// CHECK: validated by listing.seller field
    #[account(
        mut,
        constraint = seller.key() == listing.seller @ MarketplaceError::InvalidSeller
    )]
    pub seller: UncheckedAccount<'info>,

    /// Platform fee recipient
    /// CHECK: hardcoded to platform::ID
    #[account(
        mut,
        constraint = platform_fee_wallet.key() == platform::ID @ MarketplaceError::InvalidFeeWallet
    )]
    pub platform_fee_wallet: UncheckedAccount<'info>,

    /// Royalty recipient stored in listing
    /// CHECK: validated by listing.royalty_recipient
    #[account(
        mut,
        constraint = royalty_recipient.key() == listing.royalty_recipient @ MarketplaceError::InvalidRoyaltyRecipient
    )]
    pub royalty_recipient: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    /// The listing PDA — closed and rent returned to seller after sale
    #[account(
        mut,
        seeds = [b"listing", mint.key().as_ref(), seller.key().as_ref()],
        bump = listing.bump,
        close = seller,
    )]
    pub listing: Account<'info, ListingAccount>,

    /// Escrow holds the NFT during listing; closed after transfer
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Buyer's ATA for the NFT — created if it doesn't exist
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Account<'info, Mint>,

    /// Listing PDA — closed and rent returned to seller
    #[account(
        mut,
        seeds = [b"listing", mint.key().as_ref(), seller.key().as_ref()],
        bump = listing.bump,
        has_one = seller @ MarketplaceError::Unauthorized,
        close = seller,
    )]
    pub listing: Account<'info, ListingAccount>,

    /// Escrow ATA — closed and lamports returned to seller after transfer
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Seller's ATA receives the NFT back
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// ── Events ────────────────────────────────────────────────────

#[event]
pub struct TicketListed {
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price_lamports: u64,
}

#[event]
pub struct TicketSold {
    pub listing: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price_lamports: u64,
    pub platform_fee: u64,
    pub royalty_fee: u64,
    pub seller_net: u64,
}

#[event]
pub struct ListingCancelled {
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
}

// ── Errors ────────────────────────────────────────────────────

#[error_code]
pub enum MarketplaceError {
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Arithmetic overflow in fee calculation")]
    ArithmeticOverflow,
    #[msg("Seller account does not match listing")]
    InvalidSeller,
    #[msg("Platform fee wallet does not match expected address")]
    InvalidFeeWallet,
    #[msg("Royalty recipient does not match listing")]
    InvalidRoyaltyRecipient,
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
}
