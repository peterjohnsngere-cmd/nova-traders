import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import './analysis-tool.scss';

type Tab = 'analysis' | 'scanner';

type Market = {
    value: string;
    label: string;
};

const MARKETS: Market[] = [
    { value: 'R_10', label: 'Volatility 10' },
    { value: 'R_25', label: 'Volatility 25' },
    { value: 'R_50', label: 'Volatility 50' },
    { value: 'R_75', label: 'Volatility 75' },
    { value: 'R_100', label: 'Volatility 100' },
    { value: '1HZ10V', label: 'Volatility 10 (1s)' },
    { value: '1HZ25V', label: 'Volatility 25 (1s)' },
    { value: '1HZ50V', label: 'Volatility 50 (1s)' },
    { value: '1HZ75V', label: 'Volatility 75 (1s)' },
    { value: '1HZ100V', label: 'Volatility 100 (1s)' },
    { value: 'BOOM1000', label: 'Boom 1000' },
    { value: 'BOOM500', label: 'Boom 500' },
    { value: 'CRASH1000', label: 'Crash 1000' },
    { value: 'CRASH500', label: 'Crash 500' },
];

const DIGITS = Array.from({ length: 10 }, (_, index) => index);

const getLastDigit = (quote: number, pipSize?: number): number => {
    if (typeof pipSize === 'number' && pipSize >= 0) {
        const multiplier = Math.pow(10, pipSize);
        return Math.floor(Math.abs(quote) * multiplier + 0.0000001) % 10;
    }

    const text = String(quote);
    const decimalPart = text.includes('.') ? text.split('.')[1] : '';

    if (decimalPart.length > 0) {
        return Number(decimalPart[decimalPart.length - 1]);
    }

    return Math.abs(Math.floor(quote)) % 10;
};

const getPercentage = (value: number, total: number): number =>
    total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;

const AnalysisTool = () => {
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [market, setMarket] = useState('R_75');
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [digits, setDigits] = useState<number[]>([]);
    const [prices, setPrices] = useState<number[]>([]);
    const [selectedDigit, setSelectedDigit] = useState(5);
    const [selectedEO, setSelectedEO] = useState<'E' | 'O' | null>(null);

    const tickSubscriptionRef = useRef<string | null>(null);

    useEffect(() => {
        const api = api_base.api;

        if (!api) {
            return undefined;
        }

        let mounted = true;

        const resetData = () => {
            if (!mounted) return;

            setCurrentPrice(null);
            setDigits([]);
            setPrices([]);
            setSelectedEO(null);
        };

        const subscribeToTicks = async () => {
            try {
                if (tickSubscriptionRef.current) {
                    await api.send({
                        forget: tickSubscriptionRef.current,
                    });

                    tickSubscriptionRef.current = null;
                }

                resetData();

                const response = await api.send({
                    ticks: market,
                    subscribe: 1,
                });

                if (
                    mounted &&
                    response?.subscription?.id
                ) {
                    tickSubscriptionRef.current =
                        response.subscription.id;
                }
            } catch (error) {
                console.error(
                    'Nova Traders analysis tick subscription error:',
                    error
                );
            }
        };

        subscribeToTicks();

        return () => {
            mounted = false;

            if (tickSubscriptionRef.current) {
                api.send({
                    forget: tickSubscriptionRef.current,
                }).catch(() => undefined);

                tickSubscriptionRef.current = null;
            }
        };
    }, [market]);

    useEffect(() => {
        const api = api_base.api;

        if (!api) {
            return undefined;
        }

        const subscription = api
            .onMessage()
            .subscribe(({ data }: any) => {
                if (data?.msg_type !== 'tick') {
                    return;
                }

                const tick = data.tick;

                if (!tick) {
                    return;
                }

                if (tick.symbol && tick.symbol !== market) {
                    return;
                }

                const quote = Number(tick.quote);

                if (!Number.isFinite(quote)) {
                    return;
                }

                const pipSize =
                    typeof tick.pip_size === 'number'
                        ? tick.pip_size
                        : undefined;

                const digit = getLastDigit(
                    quote,
                    pipSize
                );

                setCurrentPrice(quote);

                setDigits(previous => [
                    ...previous.slice(-99),
                    digit,
                ]);

                setPrices(previous => [
                    ...previous.slice(-79),
                    quote,
                ]);
            });

        return () => {
            subscription?.unsubscribe?.();
        };
    }, [market]);

    const counts = useMemo(() => {
        const result = Array(10).fill(0) as number[];

        digits.forEach(digit => {
            if (digit >= 0 && digit <= 9) {
                result[digit] += 1;
            }
        });

        return result;
    }, [digits]);

    const total = digits.length;

    const digitPercentages = useMemo(
        () =>
            counts.map(count =>
                getPercentage(count, total)
            ),
        [counts, total]
    );

    const evenCount = digits.filter(
        digit => digit % 2 === 0
    ).length;

    const oddCount = total - evenCount;

    const evenPercentage = getPercentage(
        evenCount,
        total
    );

    const oddPercentage = getPercentage(
        oddCount,
        total
    );

    const overCount = digits.filter(
        digit => digit > selectedDigit
    ).length;

    const underCount = digits.filter(
        digit => digit < selectedDigit
    ).length;

    const overPercentage = getPercentage(
        overCount,
        total
    );

    const underPercentage = getPercentage(
        underCount,
        total
    );

    const matchesCount = counts[selectedDigit] || 0;

    const matchesPercentage = getPercentage(
        matchesCount,
        total
    );

    const differsPercentage =
        total > 0
            ? Number(
                  (100 - matchesPercentage).toFixed(1)
              )
            : 0;

    const strongestDigit =
        total > 0
            ? digitPercentages.indexOf(
                  Math.max(...digitPercentages)
              )
            : null;

    const weakestDigit =
        total > 0
            ? digitPercentages.indexOf(
                  Math.min(...digitPercentages)
              )
            : null;

    const lastThree = digits.slice(-3);

    const threeEven =
        lastThree.length === 3 &&
        lastThree.every(
            digit => digit % 2 === 0
        );

    const threeOdd =
        lastThree.length === 3 &&
        lastThree.every(
            digit => digit % 2 !== 0
        );

    const sequenceSignal =
        threeEven
            ? 'O'
            : threeOdd
              ? 'E'
              : null;

    const marketLabel =
        MARKETS.find(
            item => item.value === market
        )?.label || market;

    const formatPrice = (
        price: number | null
    ): string => {
        if (price === null) {
            return '--';
        }

        if (price < 10) {
            return price.toFixed(3);
        }

        return price.toFixed(2);
    };

    const getDigitClass = (
        digit: number
    ): string => {
        if (digit % 2 === 0) {
            return 'even';
        }

        return 'odd';
    };

    const renderPriceChart = () => {
        if (prices.length < 2) {
            return (
                <div className="analysis-chart__empty">
                    Waiting for live market data...
                </div>
            );
        }

        const width = 1000;
        const height = 360;
        const padding = 25;

        const minimum = Math.min(...prices);
        const maximum = Math.max(...prices);

        const range =
            maximum - minimum || 1;

        const points = prices
            .map((price, index) => {
                const x =
                    padding +
                    (index /
                        Math.max(
                            prices.length - 1,
                            1
                        )) *
                        (width -
                            padding * 2);

                const y =
                    height -
                    padding -
                    ((price - minimum) /
                        range) *
                        (height -
                            padding * 2);

                return `${x},${y}`;
            })
            .join(' ');

        return (
            <svg
                className="analysis-chart__svg"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
            >
                <polyline
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        );
    };

    const DigitCircle = ({
        digit,
    }: {
        digit: number;
    }) => (
        <button
            type="button"
            className={`analysis-digit ${
                selectedDigit === digit
                    ? 'selected'
                    : ''
            }`}
            onClick={() =>
                setSelectedDigit(digit)
            }
        >
            <span className="analysis-digit__number">
                {digit}
            </span>

            <span className="analysis-digit__percentage">
                {digitPercentages[digit]}%
            </span>
        </button>
    );

    const renderAnalysis = () => (
        <div className="analysis-tool__workspace">
            <div className="analysis-tool__topbar">
                <div>
                    <span className="analysis-tool__eyebrow">
                        LIVE MARKET ANALYSIS
                    </span>

                    <h1>Analysis Tool</h1>

                    <p>
                        Analyse live ticks, digits,
                        Over/Under and Even/Odd.
                    </p>
                </div>

                <div className="analysis-tool__market-control">
                    <label htmlFor="analysis-market">
                        MARKET
                    </label>

                    <select
                        id="analysis-market"
                        value={market}
                        onChange={event =>
                            setMarket(
                                event.target.value
                            )
                        }
                    >
                        {MARKETS.map(item => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="analysis-tool__stats">
                <div className="analysis-stat">
                    <span>MARKET</span>
                    <strong>{marketLabel}</strong>
                </div>

                <div className="analysis-stat">
                    <span>LIVE PRICE</span>
                    <strong>
                        {formatPrice(
                            currentPrice
                        )}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>TICKS ANALYSED</span>
                    <strong>{total}</strong>
                </div>

                <div className="analysis-stat">
                    <span>STRONGEST DIGIT</span>
                    <strong>
                        {strongestDigit === null
                            ? '--'
                            : strongestDigit}
                    </strong>
                </div>
            </div>

            <section className="analysis-section analysis-section--chart">
                <div className="analysis-section__heading">
                    <div>
                        <span>01</span>
                        <h2>LIVE CHART</h2>
                    </div>

                    <small>
                        {prices.length} live
                        points
                    </small>
                </div>

                <div className="analysis-chart">
                    {renderPriceChart()}
                </div>
            </section>

            <section className="analysis-section">
                <div className="analysis-section__heading">
                    <div>
                        <span>02</span>
                        <h2>LAST DIGITS</h2>
                    </div>

                    <small>
                        Click a digit to analyse
                        it
                    </small>
                </div>

                <div className="analysis-digit-grid">
                    {DIGITS.map(digit => (
                        <DigitCircle
                            key={digit}
                            digit={digit}
                        />
                    ))}
                </div>
            </section>

            <div className="analysis-two-column">
                <section className="analysis-section">
                    <div className="analysis-section__heading">
                        <div>
                            <span>03</span>
                            <h2>
                                OVER / UNDER
                            </h2>
                        </div>

                        <small>
                            Barrier: {selectedDigit}
                        </small>
                    </div>

                    <div className="barrier-row">
                        {DIGITS.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={
                                    selectedDigit ===
                                    digit
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    setSelectedDigit(
                                        digit
                                    )
                                }
                            >
                                {digit}
                            </button>
                        ))}
                    </div>

                    <div className="over-under-display">
                        <div
                            className={`analysis-percent-circle ${
                                overPercentage >=
                                underPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <strong>
                                {overPercentage}%
                            </strong>

                            <span>OVER</span>
                        </div>

                        <div
                            className={`analysis-percent-circle ${
                                underPercentage >
                                overPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <strong>
                                {underPercentage}%
                            </strong>

                            <span>UNDER</span>
                        </div>
                    </div>
                </section>

                <section className="analysis-section">
                    <div className="analysis-section__heading">
                        <div>
                            <span>04</span>
                            <h2>
                                EVEN / ODD
                            </h2>
                        </div>

                        <small>
                            Live percentage
                        </small>
                    </div>

                    <div className="even-odd-display">
                        <div
                            className={`even-odd-box ${
                                evenPercentage >=
                                oddPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <span>EVEN</span>

                            <strong>
                                {evenPercentage}%
                            </strong>
                        </div>

                        <div
                            className={`even-odd-box ${
                                oddPercentage >
                                evenPercentage
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <span>ODD</span>

                            <strong>
                                {oddPercentage}%
                            </strong>
                        </div>
                    </div>

                    <div className="eo-controls">
                        <button
                            type="button"
                            className={
                                selectedEO === 'E'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setSelectedEO(
                                    'E'
                                )
                            }
                        >
                            E
                        </button>

                        <button
                            type="button"
                            className={
                                selectedEO === 'O'
                                    ? 'active'
                                    : ''
                            }
                            onClick={() =>
                                setSelectedEO(
                                    'O'
                                )
                            }
                        >
                            O
                        </button>
                    </div>

                    <div className="sequence-row">
                        {lastThree.length === 0 ? (
                            <span>--</span>
                        ) : (
                            lastThree.map(
                                (
                                    digit,
                                    index
                                ) => (
                                    <span
                                        key={`${digit}-${index}`}
                                        className={getDigitClass(
                                            digit
                                        )}
                                    >
                                        {digit}
                                    </span>
                                )
                            )
                        )}
                    </div>

                    {sequenceSignal && (
                        <div className="sequence-signal">
                            <strong>
                                {sequenceSignal}
                            </strong>

                            <span>
                                Three consecutive{' '}
                                {sequenceSignal ===
                                'O'
                                    ? 'EVEN'
                                    : 'ODD'}{' '}
                                digits detected —
                                signal points to{' '}
                                {sequenceSignal}.
                            </span>
                        </div>
                    )}
                </section>
            </div>

            <section className="analysis-section">
                <div className="analysis-section__heading">
                    <div>
                        <span>05</span>
                        <h2>
                            MATCHES / DIFFERS
                        </h2>
                    </div>

                    <small>
                        Selected digit:{' '}
                        {selectedDigit}
                    </small>
                </div>

                <div className="matches-display">
                    {DIGITS.map(digit => {
                        const percentage =
                            digitPercentages[
                                digit
                            ];

                        return (
                            <button
                                key={digit}
                                type="button"
                                className={`matches-digit ${
                                    selectedDigit ===
                                    digit
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    setSelectedDigit(
                                        digit
                                    )
                                }
                            >
                                <strong>
                                    {digit}
                                </strong>

                                <span>
                                    {percentage}%
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="match-summary">
                    <div>
                        <span>MATCHES</span>

                        <strong>
                            {matchesPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>DIFFERS</span>

                        <strong>
                            {differsPercentage}%
                        </strong>
                    </div>

                    <div>
                        <span>WEAKEST DIGIT</span>

                        <strong>
                            {weakestDigit === null
                                ? '--'
                                : weakestDigit}
                        </strong>
                    </div>
                </div>
            </section>
        </div>
    );

    const scannerDigits = [...DIGITS]
        .sort(
            (a, b) =>
                digitPercentages[b] -
                digitPercentages[a]
        );

    const topScannerDigits =
        total > 0
            ? scannerDigits.slice(0, 3)
            : [];

    const renderScanner = () => (
        <div className="analysis-tool__workspace">
            <div className="scanner-header">
                <div>
                    <span className="analysis-tool__eyebrow">
                        QUICK MARKET SCANNER
                    </span>

                    <h1>Scanner</h1>

                    <p>
                        Scan the live tick stream
                        for the strongest digits.
                    </p>
                </div>

                <select
                    value={market}
                    onChange={event =>
                        setMarket(
                            event.target.value
                        )
                    }
                >
                    {MARKETS.map(item => (
                        <option
                            key={item.value}
                            value={item.value}
                        >
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="scanner-live-price">
                <span>LIVE PRICE</span>

                <strong>
                    {formatPrice(currentPrice)}
                </strong>

                <small>
                    {marketLabel} · {total} ticks
                </small>
            </div>

            <section className="scanner-section">
                <div className="scanner-section__heading">
                    <h2>STRONGEST DIGITS</h2>

                    <span>
                        Highest live
                        percentages
                    </span>
                </div>

                {topScannerDigits.length > 0 ? (
                    <div className="scanner-top-digits">
                        {topScannerDigits.map(
                            (digit, index) => (
                                <button
                                    key={digit}
                                    type="button"
                                    className={
                                        selectedDigit ===
                                        digit
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() =>
                                        setSelectedDigit(
                                            digit
                                        )
                                    }
                                >
                                    <strong>
                                        {digit}
                                    </strong>

                                    <span>
                                        #{index + 1}{' '}
                                        ·{' '}
                                        {
                                            digitPercentages[
                                                digit
                                            ]
                                        }
                                        %
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                ) : (
                    <div className="scanner-result">
                        <div>
                            <span>STATUS</span>
                            <strong>
                                WAITING
                            </strong>
                        </div>
                    </div>
                )}
            </section>

            <div className="scanner-two-column">
                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>ALL DIGITS</h2>

                        <span>
                            Live distribution
                        </span>
                    </div>

                    <div className="matches-display">
                        {DIGITS.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={`matches-digit ${
                                    selectedDigit ===
                                    digit
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    setSelectedDigit(
                                        digit
                                    )
                                }
                            >
                                <strong>
                                    {digit}
                                </strong>

                                <span>
                                    {
                                        digitPercentages[
                                            digit
                                        ]
                                    }
                                    %
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>
                            SELECTED DIGIT
                        </h2>

                        <span>
                            Quick result
                        </span>
                    </div>

                    <div className="scanner-result">
                        <div>
                            <span>DIGIT</span>

                            <strong>
                                {selectedDigit}
                            </strong>
                        </div>

                        <div>
                            <span>MATCH</span>

                            <strong>
                                {
                                    digitPercentages[
                                        selectedDigit
                                    ]
                                }
                                %
                            </strong>
                        </div>

                        <div>
                            <span>DIFFER</span>

                            <strong>
                                {total > 0
                                    ? Number(
                                          (
                                              100 -
                                              digitPercentages[
                                                  selectedDigit
                                              ]
                                          ).toFixed(
                                              1
                                          )
                                      )
                                    : 0}
                                %
                            </strong>
                        </div>
                    </div>
                </section>
            </div>

            <section className="scanner-section">
                <div className="scanner-section__heading">
                    <h2>RECENT TICKS</h2>

                    <span>
                        Latest live digits
                    </span>
                </div>

                <div className="sequence-row sequence-row--large">
                    {digits.length === 0 ? (
                        <span>--</span>
                    ) : (
                        digits
                            .slice(-30)
                            .map(
                                (
                                    digit,
                                    index
                                ) => (
                                    <span
                                        key={`${digit}-${index}`}
                                        className={getDigitClass(
                                            digit
                                        )}
                                    >
                                        {digit}
                                    </span>
                                )
                            )
                    )}
                </div>
            </section>
        </div>
    );

    return (
        <div className="analysis-tool">
            <nav className="analysis-tool__navigation">
                <button
                    type="button"
                    className={
                        activeTab === 'analysis'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab(
                            'analysis'
                        )
                    }
                >
                    ANALYSIS TOOL
                </button>

                <button
                    type="button"
                    className={
                        activeTab === 'scanner'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab(
                            'scanner'
                        )
                    }
                >
                    SCANNER
                </button>
            </nav>

            {activeTab === 'analysis'
                ? renderAnalysis()
                : renderScanner()}
        </div>
    );
};

export default AnalysisTool;
