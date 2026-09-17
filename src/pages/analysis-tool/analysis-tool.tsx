import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

import { TicksService } from '@/external/bot-skeleton/services/api';
import {
    analysisToolStore,
    type AnalysisMode,
    type AnalysisTick,
} from '@/stores/analysis-tool-store';

import './analysis-tool.scss';

const MARKETS = [
    { symbol: 'R_10', label: 'Volatility 10' },
    { symbol: 'R_25', label: 'Volatility 25' },
    { symbol: 'R_50', label: 'Volatility 50' },
    { symbol: 'R_75', label: 'Volatility 75' },
    { symbol: 'R_100', label: 'Volatility 100' },
    { symbol: '1HZ10V', label: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', label: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', label: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', label: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', label: 'Volatility 100 (1s)' },
];

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const SEQUENCE_LENGTH = 36;

const AnalysisTool = observer(() => {
    const market = analysisToolStore.market;
    const activeMode = analysisToolStore.activeMode;

    const recentTicks = analysisToolStore.recentTicks;
    const currentTick = analysisToolStore.currentTick;
    const currentDigit = analysisToolStore.currentDigit;

    const ticksServiceRef = useRef<any>(null);
    const monitorKeyRef = useRef<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const startTicks = async () => {
            try {
                if (!ticksServiceRef.current) {
                    ticksServiceRef.current = new TicksService();
                }

                const service = ticksServiceRef.current;

                if (monitorKeyRef.current) {
                    try {
                        await service.stopMonitor({
                            symbol: market,
                            granularity: undefined,
                            key: monitorKeyRef.current,
                        });
                    } catch {}

                    monitorKeyRef.current = null;
                }

                analysisToolStore.clearTicks();

                const key = await service.monitor({
                    symbol: market,
                    granularity: false,

                    callback: (newTicks: AnalysisTick[]) => {
                        if (!mounted) return;

                        const safeTicks = Array.isArray(newTicks)
                            ? newTicks
                                  .filter(
                                      tick =>
                                          tick &&
                                          typeof tick.epoch === 'number' &&
                                          typeof tick.quote === 'number'
                                  )
                                  .slice(-1000)
                            : [];

                        analysisToolStore.setTicks(safeTicks);
                    },
                });

                if (mounted) {
                    monitorKeyRef.current = key;
                }
            } catch (error) {
                console.error(
                    'Analysis Tool tick error:',
                    error
                );
            }
        };

        startTicks();

        return () => {
            mounted = false;

            if (
                ticksServiceRef.current &&
                monitorKeyRef.current
            ) {
                ticksServiceRef.current
                    .stopMonitor({
                        symbol: market,
                        granularity: undefined,
                        key: monitorKeyRef.current,
                    })
                    .catch(() => {});

                monitorKeyRef.current = null;
            }
        };
    }, [market]);

    const riseFallSequence =
        analysisToolStore.riseFallSequence;

    const risePercentage =
        analysisToolStore.risePercentage;

    const fallPercentage =
        analysisToolStore.fallPercentage;

    const matchesPercentage =
        analysisToolStore.matchesPercentage;

    const differsPercentage =
        analysisToolStore.differsPercentage;

    const overPercentage =
        analysisToolStore.overPercentage;

    const underPercentage =
        analysisToolStore.underPercentage;

    const digitPercentages =
        analysisToolStore.digitPercentages;

    const evenOddSequence =
        analysisToolStore.evenOddSequence;

    const evenPercentage =
        analysisToolStore.evenPercentage;

    const oddPercentage =
        analysisToolStore.oddPercentage;

    const selectedBarrier =
        analysisToolStore.selectedBarrier;

    const selectedMatchDigit =
        analysisToolStore.selectedMatchDigit;

    const options = [
        {
            id: 'rise-fall' as AnalysisMode,
            title: 'Rise & Fall',
            subtitle: 'Price direction',
            icon: '↕',
        },
        {
            id: 'matches-differs' as AnalysisMode,
            title: 'Matches & Differs',
            subtitle: 'Digit repetition',
            icon: '=',
        },
        {
            id: 'over-under' as AnalysisMode,
            title: 'Over & Under',
            subtitle: 'Digit barrier',
            icon: '⌁',
        },
        {
            id: 'even-odd' as AnalysisMode,
            title: 'Even & Odd',
            subtitle: 'Digit parity',
            icon: '◐',
        },
    ];

    const activeTitle =
        options.find(
            option => option.id === activeMode
        )?.title || '';

    return (
        <div className="analysis-tool">
            <div className="analysis-tool__workspace">

                <div className="analysis-tool__topbar">

                    <div>
                        <h1>Analysis Tool</h1>

                        <span>
                            Live Deriv market analysis
                        </span>
                    </div>

                    <select
                        value={market}
                        onChange={event =>
                            analysisToolStore.setMarket(
                                event.target.value
                            )
                        }
                    >
                        {MARKETS.map(item => (
                            <option
                                key={item.symbol}
                                value={item.symbol}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>

                </div>

                <div className="analysis-tool__stats">

                    <div className="analysis-stat">
                        <span>LIVE PRICE</span>

                        <strong>
                            {currentTick
                                ? currentTick.quote.toFixed(2)
                                : '...'}
                        </strong>
                    </div>

                    <div className="analysis-stat">
                        <span>LAST DIGIT</span>

                        <strong>
                            {currentDigit ?? '-'}
                        </strong>
                    </div>

                    <div className="analysis-stat">
                        <span>LIVE TICKS</span>

                        <strong>
                            {recentTicks.length}
                        </strong>
                    </div>

                    <div className="analysis-stat">
                        <span>MARKET</span>

                        <strong>{market}</strong>
                    </div>

                </div>

                {!activeMode && (
                    <section className="analysis-section analysis-selector">

                        <div className="analysis-section__heading">

                            <div>
                                <h2>Choose Analysis</h2>

                                <span>
                                    Select what you want to analyse
                                </span>
                            </div>

                        </div>

                        <div className="analysis-options">

                            {options.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className="analysis-option"
                                    onClick={() =>
                                        analysisToolStore.setActiveMode(
                                            option.id
                                        )
                                    }
                                >
                                    <span className="analysis-option__icon">
                                        {option.icon}
                                    </span>

                                    <span className="analysis-option__text">

                                        <strong>
                                            {option.title}
                                        </strong>

                                        <small>
                                            {option.subtitle}
                                        </small>

                                    </span>

                                    <span className="analysis-option__arrow">
                                        →
                                    </span>

                                </button>
                            ))}

                        </div>

                    </section>
                )}

                {activeMode && (
                    <section className="analysis-section analysis-active-panel">

                        <div className="analysis-section__heading">

                            <div>

                                <h2>{activeTitle}</h2>

                                <span>
                                    {market} • Live analysis
                                </span>

                            </div>

                            <button
                                type="button"
                                className="analysis-close"
                                onClick={() =>
                                    analysisToolStore.setActiveMode(
                                        null
                                    )
                                }
                            >
                                ← BACK
                            </button>

                        </div>

                        {activeMode === 'rise-fall' && (
                            <>

                                <div className="analysis-bars">

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                risePercentage >=
                                                fallPercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            R
                                        </div>

                                        <div className="analysis-bar-label">
                                            RISE
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${risePercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {risePercentage}%
                                        </div>

                                    </div>

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                fallPercentage >
                                                risePercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            F
                                        </div>

                                        <div className="analysis-bar-label">
                                            FALL
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${fallPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {fallPercentage}%
                                        </div>

                                    </div>

                                </div>

                                <div className="analysis-sequence-panel">

                                    <div className="sequence-heading">

                                        <span>
                                            RECENT RISE / FALL
                                        </span>

                                        <strong>
                                            LAST {SEQUENCE_LENGTH}
                                        </strong>

                                    </div>

                                    <div className="sequence-row sequence-row--signals">

                                        {riseFallSequence.map(
                                            (signal, index) => (
                                                <span
                                                    key={`${signal}-${index}`}
                                                    className={
                                                        signal === 'R'
                                                            ? 'sequence-r'
                                                            : 'sequence-f'
                                                    }
                                                >
                                                    {signal}
                                                </span>
                                            )
                                        )}

                                    </div>

                                    <div className="sequence-newest">
                                        NEWEST →
                                    </div>

                                </div>

                            </>
                        )}

                        {activeMode === 'matches-differs' && (
                            <>

                                <div className="analysis-digit-selector">

                                    {DIGITS.map(digit => (
                                        <button
                                            key={digit}
                                            type="button"
                                            className={
                                                selectedMatchDigit === digit
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() =>
                                                analysisToolStore.setSelectedMatchDigit(
                                                    digit
                                                )
                                            }
                                        >
                                            {digit}
                                        </button>
                                    ))}

                                </div>

                                <div className="analysis-barrier-label">

                                    Selected digit:{' '}

                                    <strong>
                                        {selectedMatchDigit}
                                    </strong>

                                </div>

                                <div className="analysis-line-layout">

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            MATCHES
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${matchesPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {matchesPercentage}%
                                        </strong>

                                    </div>

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            DIFFERS
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${differsPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {differsPercentage}%
                                        </strong>

                                    </div>

                                </div>

                                <div className="analysis-digit-grid">

                                    {digitPercentages.map(item => (
                                        <div
                                            key={item.digit}
                                            className={`analysis-digit-circle ${
                                                currentDigit ===
                                                item.digit
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >

                                            <strong>
                                                {item.percentage}%
                                            </strong>

                                            <span>
                                                {item.digit}
                                            </span>

                                        </div>
                                    ))}

                                </div>

                            </>
                        )}

                        {activeMode === 'over-under' && (
                            <>

                                <div className="analysis-digit-selector">

                                    {DIGITS.map(digit => (
                                        <button
                                            key={digit}
                                            type="button"
                                            className={
                                                selectedBarrier === digit
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() =>
                                                analysisToolStore.setSelectedBarrier(
                                                    digit
                                                )
                                            }
                                        >
                                            {digit}
                                        </button>
                                    ))}

                                </div>

                                <div className="analysis-barrier-label">

                                    Selected barrier:{' '}

                                    <strong>
                                        {selectedBarrier}
                                    </strong>

                                </div>

                                <div className="analysis-line-layout">

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            OVER {selectedBarrier}
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${overPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {overPercentage}%
                                        </strong>

                                    </div>

                                    <div className="analysis-percentage-line">

                                        <span className="analysis-line-title">
                                            UNDER {selectedBarrier}
                                        </span>

                                        <div className="analysis-line-track">

                                            <div
                                                className="analysis-line-fill"
                                                style={{
                                                    width: `${underPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <strong>
                                            {underPercentage}%
                                        </strong>

                                    </div>

                                </div>

                                <div className="analysis-digit-grid">

                                    {digitPercentages.map(item => (
                                        <div
                                            key={item.digit}
                                            className={`analysis-digit-circle ${
                                                currentDigit ===
                                                item.digit
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >

                                            <strong>
                                                {item.percentage}%
                                            </strong>

                                            <span>
                                                {item.digit}
                                            </span>

                                        </div>
                                    ))}

                                </div>

                            </>
                        )}

                        {activeMode === 'even-odd' && (
                            <>

                                <div className="analysis-bars">

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                evenPercentage >=
                                                oddPercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            E
                                        </div>

                                        <div className="analysis-bar-label">
                                            EVEN
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${evenPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {evenPercentage}%
                                        </div>

                                    </div>

                                    <div className="analysis-bar-row">

                                        <div
                                            className={`analysis-bar-signal ${
                                                oddPercentage >
                                                evenPercentage
                                                    ? 'current'
                                                    : ''
                                            }`}
                                        >
                                            O
                                        </div>

                                        <div className="analysis-bar-label">
                                            ODD
                                        </div>

                                        <div className="analysis-bar-track">

                                            <div
                                                className="analysis-bar-fill"
                                                style={{
                                                    width: `${oddPercentage}%`,
                                                }}
                                            />

                                        </div>

                                        <div className="analysis-bar-percent">
                                            {oddPercentage}%
                                        </div>

                                    </div>

                                </div>

                                <div className="analysis-sequence-panel">

                                    <div className="sequence-heading">

                                        <span>
                                            RECENT EVEN / ODD
                                        </span>

                                        <strong>
                                            LAST {SEQUENCE_LENGTH}
                                        </strong>

                                    </div>

                                    <div className="sequence-row sequence-row--signals">

                                        {evenOddSequence.map(
                                            (signal, index) => (
                                                <span
                                                    key={`${signal}-${index}`}
                                                    className={
                                                        signal === 'E'
                                                            ? 'sequence-e'
                                                            : 'sequence-o'
                                                    }
                                                >
                                                    {signal}
                                                </span>
                                            )
                                        )}

                                    </div>

                                    <div className="sequence-newest">
                                        NEWEST →
                                    </div>

                                </div>

                            </>
                        )}

                    </section>
                )}

            </div>
        </div>
    );
});

export default AnalysisTool;
