import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import ChartWrapper from '@/pages/chart/chart-wrapper';
import './analysis-tool.scss';

type Tab = 'analysis' | 'scanner';

const MARKETS = [
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

const getLastDigit = (quote: number): number => {
    const text = String(quote);
    const digits = text.replace(/\D/g, '');
    return Number(digits.charAt(digits.length - 1));
};

const getPercent = (value: number, total: number): number => {
    if (!total) return 0;
    return Number(((value / total) * 100).toFixed(1));
};

const AnalysisTool = () => {
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [market, setMarket] = useState('R_75');
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [digitCounts, setDigitCounts] = useState<number[]>(
        Array(10).fill(0)
    );
    const [recentDigits, setRecentDigits] = useState<number[]>([]);
    const [selectedDigit, setSelectedDigit] = useState(5);
    const [evenSignal, setEvenSignal] = useState(false);
    const [oddSignal, setOddSignal] = useState(false);

    const tickSubscriptionRef = useRef<any>(null);

    useEffect(() => {
        if (!api_base.api) return;

        const subscribe = async () => {
            try {
                if (tickSubscriptionRef.current) {
                    await api_base.api.send({
                        forget: tickSubscriptionRef.current,
                    });
                }

                setCurrentPrice(null);
                setDigitCounts(Array(10).fill(0));
                setRecentDigits([]);

                const response = await api_base.api.send({
                    ticks: market,
                    subscribe: 1,
                });

                if (response?.subscription?.id) {
                    tickSubscriptionRef.current =
                        response.subscription.id;
                }
            } catch {
                // Keep existing Deriv connection alive.
            }
        };

        subscribe();

        return () => {
            if (tickSubscriptionRef.current && api_base.api) {
                api_base.api
                    .send({
                        forget: tickSubscriptionRef.current,
                    })
                    .catch(() => undefined);

                tickSubscriptionRef.current = null;
            }
        };
    }, [market]);

    useEffect(() => {
        if (!api_base.api) return;

        const subscription = api_base.api
            .onMessage()
            .subscribe(({ data }: any) => {
                if (data?.msg_type !== 'tick') return;

                const tick = data.tick;

                if (tick?.symbol && tick.symbol !== market) {
                    return;
                }

                const quote = Number(tick?.quote);

                if (!Number.isFinite(quote)) return;

                const lastDigit = getLastDigit(quote);

                if (
                    !Number.isInteger(lastDigit) ||
                    lastDigit < 0 ||
                    lastDigit > 9
                ) {
                    return;
                }

                setCurrentPrice(quote);

                setDigitCounts(previous => {
                    const next = [...previous];
                    next[lastDigit] += 1;

                    const total = next.reduce(
                        (sum, value) => sum + value,
                        0
                    );

                    if (total > 100) {
                        const largestIndex = next.indexOf(
                            Math.max(...next)
                        );

                        if (largestIndex >= 0) {
                            next[largestIndex] = Math.max(
                                0,
                                next[largestIndex] - 1
                            );
                        }
                    }

                    return next;
                });

                setRecentDigits(previous => [
                    ...previous.slice(-29),
                    lastDigit,
                ]);
            });

        return () => {
            subscription?.unsubscribe?.();
        };
    }, [market]);

    const totalTicks = useMemo(
        () => digitCounts.reduce((sum, value) => sum + value, 0),
        [digitCounts]
    );

    const digitPercentages = useMemo(
        () =>
            digitCounts.map(value =>
                getPercent(value, totalTicks)
            ),
        [digitCounts, totalTicks]
    );

    const evenCount = digitCounts.reduce(
        (sum, value, digit) =>
            digit % 2 === 0 ? sum + value : sum,
        0
    );

    const oddCount = totalTicks - evenCount;

    const evenPercentage = getPercent(
        evenCount,
        totalTicks
    );

    const oddPercentage = getPercent(
        oddCount,
        totalTicks
    );

    const overCount = digitCounts.reduce(
        (sum, value, digit) =>
            digit > selectedDigit ? sum + value : sum,
        0
    );

    const underCount = digitCounts.reduce(
        (sum, value, digit) =>
            digit < selectedDigit ? sum + value : sum,
        0
    );

    const matchesCount = digitCounts[selectedDigit] || 0;

    const overPercentage = getPercent(
        overCount,
        totalTicks
    );

    const underPercentage = getPercent(
        underCount,
        totalTicks
    );

    const matchesPercentage = getPercent(
        matchesCount,
        totalTicks
    );

    const differsPercentage = Number(
        (100 - matchesPercentage).toFixed(1)
    );

    const strongestDigit =
        totalTicks > 0
            ? digitPercentages.indexOf(
                  Math.max(...digitPercentages)
              )
            : null;

    const weakestDigit =
        totalTicks > 0
            ? digitPercentages.indexOf(
                  Math.min(...digitPercentages)
              )
            : null;

    const marketLabel =
        MARKETS.find(item => item.value === market)?.label ||
        market;

    const formatPrice = (price: number | null) => {
        if (price === null) return '--';
        return price.toFixed(price < 10 ? 3 : 2);
    };

    const renderDigitCircle = (digit: number) => (
        <button
            key={digit}
            type="button"
            className={`analysis-digit ${
                selectedDigit === digit ? 'selected' : ''
            }`}
            onClick={() => setSelectedDigit(digit)}
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

                    <h1>{marketLabel}</h1>

                    <p>
                        Real-time analysis powered by the
                        live Deriv tick stream.
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
                            setMarket(event.target.value)
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
                    <span>LIVE PRICE</span>
                    <strong>
                        {formatPrice(currentPrice)}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>TICKS</span>
                    <strong>{totalTicks}</strong>
                </div>

                <div className="analysis-stat">
                    <span>STRONGEST</span>
                    <strong>
                        {strongestDigit !== null
                            ? strongestDigit
                            : '--'}
                    </strong>
                </div>

                <div className="analysis-stat">
                    <span>WEAKEST</span>
                    <strong>
                        {weakestDigit !== null
                            ? weakestDigit
                            : '--'}
                    </strong>
                </div>
            </div>

            <section className="analysis-section analysis-section--chart">
                <div className="analysis-section__heading">
                    <div>
                        <span>01</span>
                        <h2>CHART</h2>
                    </div>

                    <small>LIVE</small>
                </div>

                <div className="analysis-chart">
                    <ChartWrapper
                        prefix="analysis-tool-chart"
                        show_digits_stats={false}
                    />
                </div>
            </section>

            <section className="analysis-section">
                <div className="analysis-section__heading">
                    <div>
                        <span>02</span>
                        <h2>LAST DIGITS</h2>
                    </div>

                    <small>
                        {totalTicks} TICKS
                    </small>
                </div>

                <div className="analysis-digit-grid">
                    {DIGITS.map(renderDigitCircle)}
                </div>
            </section>

            <div className="analysis-two-column">
                <section className="analysis-section">
                    <div className="analysis-section__heading">
                        <div>
                            <span>03</span>
                            <h2>OVER / UNDER</h2>
                        </div>

                        <small>
                            BARRIER {selectedDigit}
                        </small>
                    </div>

                    <div className="barrier-row">
                        {DIGITS.map(digit => (
                            <button
                                key={digit}
                                type="button"
                                className={
                                    selectedDigit === digit
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    setSelectedDigit(digit)
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
                            <h2>EVEN / ODD</h2>
                        </div>

                        <small>LIVE RATIO</small>
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
                                evenSignal ? 'active' : ''
                            }
                            onClick={() => {
                                setEvenSignal(true);
                                setOddSignal(false);
                            }}
                        >
                            E
                        </button>

                        <button
                            type="button"
                            className={
                                oddSignal ? 'active' : ''
                            }
                            onClick={() => {
                                setOddSignal(true);
                                setEvenSignal(false);
                            }}
                        >
                            O
                        </button>
                    </div>

                    <div className="sequence-row">
                        {recentDigits
                            .slice(-12)
                            .map((digit, index) => (
                                <span
                                    key={`${digit}-${index}`}
                                    className={
                                        digit % 2 === 0
                                            ? 'even'
                                            : 'odd'
                                    }
                                >
                                    {digit}
                                </span>
                            ))}
                    </div>
                </section>
            </div>

            <section className="analysis-section">
                <div className="analysis-section__heading">
                    <div>
                        <span>05</span>
                        <h2>MATCHES / DIFFERS</h2>
                    </div>

                    <small>
                        DIGIT {selectedDigit}
                    </small>
                </div>

                <div className="matches-display">
                    {DIGITS.map(digit => (
                        <button
                            key={digit}
                            type="button"
                            className={`matches-digit ${
                                selectedDigit === digit
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setSelectedDigit(digit)
                            }
                        >
                            <strong>{digit}</strong>
                            <span>
                                {digitPercentages[digit]}%
                            </span>
                        </button>
                    ))}
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
                        <span>SELECTED DIGIT</span>
                        <strong>
                            {selectedDigit}
                        </strong>
                    </div>
                </div>
            </section>
        </div>
    );

    const renderScanner = () => (
        <div className="analysis-tool__workspace">
            <div className="scanner-header">
                <div>
                    <span className="analysis-tool__eyebrow">
                        QUICK MARKET SCAN
                    </span>

                    <h1>{marketLabel}</h1>

                    <p>
                        Fast live view of the current
                        market conditions.
                    </p>
                </div>

                <select
                    value={market}
                    onChange={event =>
                        setMarket(event.target.value)
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
                    {totalTicks} live ticks analysed
                </small>
            </div>

            <section className="scanner-section">
                <div className="scanner-section__heading">
                    <h2>DIGIT SCAN</h2>
                    <span>LIVE %</span>
                </div>

                <div className="analysis-digit-grid">
                    {DIGITS.map(renderDigitCircle)}
                </div>
            </section>

            <div className="scanner-two-column">
                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>OVER / UNDER</h2>
                        <span>
                            BARRIER {selectedDigit}
                        </span>
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

                <section className="scanner-section">
                    <div className="scanner-section__heading">
                        <h2>EVEN / ODD</h2>
                        <span>LIVE %</span>
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
                </section>
            </div>

            <section className="scanner-section">
                <div className="scanner-section__heading">
                    <h2>MATCHES / DIFFERS</h2>
                    <span>
                        DIGIT {selectedDigit}
                    </span>
                </div>

                <div className="matches-display">
                    {DIGITS.map(digit => (
                        <button
                            key={digit}
                            type="button"
                            className={`matches-digit ${
                                selectedDigit === digit
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setSelectedDigit(digit)
                            }
                        >
                            <strong>{digit}</strong>
                            <span>
                                {digitPercentages[digit]}%
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="scanner-section">
                <div className="scanner-section__heading">
                    <h2>RECENT TICKS</h2>
                    <span>LAST 20</span>
                </div>

                <div className="sequence-row sequence-row--large">
                    {recentDigits
                        .slice(-20)
                        .map((digit, index) => (
                            <span
                                key={`${digit}-${index}`}
                                className={
                                    digit % 2 === 0
                                        ? 'even'
                                        : 'odd'
                                }
                            >
                                {digit}
                            </span>
                        ))}
                </div>
            </section>
        </div>
    );

    return (
        <div className="analysis-tool">
            <div className="analysis-tool__navigation">
                <button
                    type="button"
                    className={
                        activeTab === 'analysis'
                            ? 'active'
                            : ''
                    }
                    onClick={() =>
                        setActiveTab('analysis')
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
                        setActiveTab('scanner')
                    }
                >
                    SCANNER
                </button>
            </div>

            {activeTab === 'analysis'
                ? renderAnalysis()
                : renderScanner()}
        </div>
    );
};

export default AnalysisTool;
