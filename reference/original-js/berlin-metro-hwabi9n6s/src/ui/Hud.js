function euro(cents) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function eta(seconds) {
  if (!Number.isFinite(seconds)) return '--';
  if (seconds <= 0.9) return 'nu';
  const whole = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(whole / 60);
  return `${mins}:${String(whole % 60).padStart(2, '0')}`;
}

export class Hud {
  constructor() {
    this.hud = document.querySelector('#hud');
    this.stationName = document.querySelector('#stationName');
    this.trainStatus = document.querySelector('#trainStatus');
    this.hint = document.querySelector('#hint');
    this.routeProgress = document.querySelector('#routeProgress');
    this.routeProgressFill = document.querySelector('#routeProgressFill');
    this.routeProgressDot = document.querySelector('#routeProgressDot');
    this.routeStartLabel = document.querySelector('#routeStartLabel');
    this.routeEndLabel = document.querySelector('#routeEndLabel');
    this.balance = document.querySelector('#balance');
    this.ticketState = document.querySelector('#ticketState');
    this.interactButton = document.querySelector('#interactionButton');
    this.toast = document.querySelector('#toast');
    this.toastTimer = null;
    this.trainStatuses = new Map();
  }

  show() {
    this.hud.classList.remove('hidden');
    this.hud.setAttribute('aria-hidden', 'false');
  }

  onTrainStatus(train, text) {
    this.trainStatuses.set(train.id, text);
  }

  updateEconomy(state) {
    this.balance.textContent = euro(state.balanceCents);
    this.ticketState.textContent = state.hasTicket ? 'Ticket ✓' : 'Geen ticket';
  }

  onInteractionFocus(interaction) {
    if (!interaction) {
      this.interactButton.classList.add('hidden');
      return;
    }
    this.interactButton.textContent = interaction.kind === 'pfand' ? 'PAK OP · +€0,25' : 'GEBRUIK AUTOMAAT';
    this.interactButton.classList.remove('hidden');
  }

  notify(text) {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.add('hidden'), 1600);
  }

  updatePlayer(player, trains, stations) {
    const activeTrain = player.activeTrain;
    this.routeProgress.classList.toggle('hidden', !activeTrain);

    if (activeTrain) {
      const isTerminal = activeTrain.timeline.isTerminal;
      const progress = isTerminal ? 1 : Math.max(0, Math.min(1, activeTrain.routeProgress || 0));
      const percent = progress * 100;
      this.routeProgressFill.style.width = `${percent}%`;
      this.routeProgressDot.style.left = `${percent}%`;
      this.routeStartLabel.textContent = activeTrain.originName;
      this.routeEndLabel.textContent = isTerminal ? 'Endstation' : activeTrain.destinationName;
      this.routeProgress.setAttribute('aria-label', `${activeTrain.originName} naar ${isTerminal ? 'endstation' : activeTrain.destinationName}`);

      this.stationName.textContent = activeTrain.state === 'cruising' ? 'Unterwegs' : activeTrain.originName;
      this.trainStatus.textContent = this.trainStatuses.get(activeTrain.id) || `${activeTrain.line} richting ${activeTrain.terminusName}`;
      this.hint.textContent = isTerminal
        ? `${activeTrain.originName} · eindpunt. Stap uit om de treinloop door te laten gaan.`
        : activeTrain.state === 'boarding'
          ? `Deuren open · volgende halte ${activeTrain.destinationName}.`
          : `${activeTrain.line} richting ${activeTrain.terminusName} · volgende halte ${activeTrain.destinationName}.`;
      return;
    }

    const station = player.currentStation || stations?.[0];
    if (!station) return;
    this.stationName.textContent = station.name;

    const available = trains
      .filter((train) => station.index + train.direction >= 0 && station.index + train.direction < stations.length)
      .map((train) => ({ train, eta: train.etaToStation(station.index) }))
      .sort((a, b) => a.eta - b.eta);

    if (!available.length) {
      this.trainStatus.textContent = 'U2';
      this.hint.textContent = 'Kijk naar Pfand of de automaat om ermee te interacteren.';
      return;
    }

    this.trainStatus.textContent = available
      .map(({ train, eta: seconds }) => `${train.terminusName} ${eta(seconds)}`)
      .join(' · ');
    this.hint.textContent = 'Beide U2-richtingen rijden door de hele lijn. Kijk naar Pfand of de automaat voor interactie.';
  }
}
