import { action, computed, makeObservable, observable } from 'mobx';

export type AnalysisTick = {
    epoch: number;
    quote: number;
};

export type AnalysisMode =
    | 'rise-fall'
    | 'matches-differs'
    | 'over-under'
    | 'even-odd';

const MAX_TICKS = 1000;
const ANALYSIS_TICKS = 100;
const SEQUENCE_LENGTH = 36;

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const getLastDigit = (quote: number) => {
    const text = String(quote);
    const decimals = text.split('.')[1] || '';

    if (!decimals.length) {
        return Math.abs(Math.floor(quote)) % 10;
    }

    return Number(decimals[decimals.length - 1]);
};

const percentage = (count: number, total: number) =>
    total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;

export default class AnalysisToolStore {
    market = 'R_100';
    ticks: AnalysisTick[] = [];

    selectedBarrier = 5;
    selectedMatchDigit = 0;

    activeMode: AnalysisMode | null = null;

    constructor() {
        makeObservable(this, {
            market: observable,
            ticks: observable,
            selectedBarrier: observable,
            selectedMatchDigit: observable,
            activeMode: observable,

            recentTicks: computed,
            currentTick: computed,
            currentPrice: computed,
            currentDigit: computed,

            riseFallSequence: computed,
            risePercentage: computed,
            fallPercentage: computed,

            matchesPercentage: computed,
            differsPercentage: computed,

            overPercentage: computed,
            underPercentage: computed,

            digitPercentages: computed,

            evenOddSequence: computed,
            evenPercentage: computed,
            oddPercentage: computed,

            setMarket: action,
            setTicks: action,
            addTicks: action,
            clearTicks: action,
            setSelectedBarrier: action,
            setSelectedMatchDigit: action,
            setActiveMode: action,
        });
    }

    setMarket = (market: string) => {
        this.market = market;
    };

    setTicks = (ticks: AnalysisTick[]) => {
        this.ticks = ticks
            .filter(
                tick =>
                    tick &&
                    typeof tick.epoch === 'number' &&
                    typeof tick.quote === 'number'
            )
            .slice(-MAX_TICKS);
    };

    addTicks = (newTicks: AnalysisTick[]) => {
        this.setTicks([...this.ticks, ...newTicks]);
    };

    clearTicks = () => {
        this.ticks = [];
    };

    setSelectedBarrier = (barrier: number) => {
        this.selectedBarrier = barrier;
    };

    setSelectedMatchDigit = (digit: number) => {
        this.selectedMatchDigit = digit;
    };

    setActiveMode = (mode: AnalysisMode | null) => {
        this.activeMode = mode;
    };

    get recentTicks() {
        return this.ticks.slice(-ANALYSIS_TICKS);
    }

    get currentTick() {
        return this.recentTicks[this.recentTicks.length - 1];
    }

    get currentPrice() {
        return this.currentTick?.quote ?? null;
    }

    get currentDigit() {
        return this.currentTick
            ? getLastDigit(this.currentTick.quote)
            : null;
    }

    get riseFallSequence() {
        const sequence: ('R' | 'F')[] = [];

        for (let i = 1; i < this.recentTicks.length; i += 1) {
            const current = this.recentTicks[i].quote;
            const previous = this.recentTicks[i - 1].quote;

            if (current > previous) {
                sequence.push('R');
            } else if (current < previous) {
                sequence.push('F');
            }
        }

        return sequence.slice(-SEQUENCE_LENGTH);
    }

    get risePercentage() {
        const rise = this.riseFallSequence.filter(
            signal => signal === 'R'
        ).length;

        return percentage(rise, this.riseFallSequence.length);
    }

    get fallPercentage() {
        const fall = this.riseFallSequence.filter(
            signal => signal === 'F'
        ).length;

        return percentage(fall, this.riseFallSequence.length);
    }

    get matchesPercentage() {
        const matches = this.recentTicks.filter(
            tick =>
                getLastDigit(tick.quote) ===
                this.selectedMatchDigit
        ).length;

        return percentage(matches, this.recentTicks.length);
    }

    get differsPercentage() {
        const differs = this.recentTicks.filter(
            tick =>
                getLastDigit(tick.quote) !==
                this.selectedMatchDigit
        ).length;

        return percentage(differs, this.recentTicks.length);
    }

    get overPercentage() {
        const over = this.recentTicks.filter(
            tick =>
                getLastDigit(tick.quote) >
                this.selectedBarrier
        ).length;

        return percentage(over, this.recentTicks.length);
    }

    get underPercentage() {
        const under = this.recentTicks.filter(
            tick =>
                getLastDigit(tick.quote) <=
                this.selectedBarrier
        ).length;

        return percentage(under, this.recentTicks.length);
    }

    get digitPercentages() {
        return DIGITS.map(digit => {
            const count = this.recentTicks.filter(
                tick => getLastDigit(tick.quote) === digit
            ).length;

            return {
                digit,
                percentage: percentage(
                    count,
                    this.recentTicks.length
                ),
            };
        });
    }

    get evenOddSequence() {
        return this.recentTicks
            .map(tick => {
                const digit = getLastDigit(tick.quote);

                return digit % 2 === 0 ? 'E' : 'O';
            })
            .slice(-SEQUENCE_LENGTH);
    }

    get evenPercentage() {
        const even = this.recentTicks.filter(tick => {
            const digit = getLastDigit(tick.quote);
            return digit % 2 === 0;
        }).length;

        return percentage(even, this.recentTicks.length);
    }

    get oddPercentage() {
        const odd = this.recentTicks.filter(tick => {
            const digit = getLastDigit(tick.quote);
            return digit % 2 !== 0;
        }).length;

        return percentage(odd, this.recentTicks.length);
    }
}
