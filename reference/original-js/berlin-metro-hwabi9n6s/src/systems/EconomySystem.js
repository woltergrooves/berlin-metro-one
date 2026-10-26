import { CONFIG } from '../config.js';

export class EconomySystem {
  constructor({
    startingCents = CONFIG.economy.startingCents,
    pfandCents = CONFIG.economy.pfandCents,
    ticketCents = CONFIG.economy.testTicketCents,
  } = {}) {
    this.balanceCents = startingCents;
    this.pfandCents = pfandCents;
    this.ticketCents = ticketCents;
    this.hasTicket = false;
    this.collectedPfand = 0;
  }

  collectPfand() {
    this.balanceCents += this.pfandCents;
    this.collectedPfand += 1;
    return this.snapshot();
  }

  buyTicket() {
    if (this.hasTicket) {
      return { ...this.snapshot(), success: false, message: 'Je hebt al een ticket.' };
    }
    if (this.balanceCents < this.ticketCents) {
      const missing = this.ticketCents - this.balanceCents;
      return { ...this.snapshot(), success: false, message: `Nog €${(missing / 100).toFixed(2).replace('.', ',')} nodig.` };
    }
    this.balanceCents -= this.ticketCents;
    this.hasTicket = true;
    return { ...this.snapshot(), success: true, message: 'U2 testticket gekocht ✓' };
  }

  snapshot() {
    return {
      balanceCents: this.balanceCents,
      balance: this.balanceCents / 100,
      hasTicket: this.hasTicket,
      collectedPfand: this.collectedPfand,
      ticketCents: this.ticketCents,
    };
  }
}
