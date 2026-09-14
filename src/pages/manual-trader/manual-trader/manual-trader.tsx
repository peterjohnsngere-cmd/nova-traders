import React, { useState } from 'react';

import './manual-trader.scss';

const MIN_STAKE = 0.35;

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

const CONTRACTS = [
    { value: 'CALL', label: 'Rise' },
    { value: 'PUT', label: 'Fall' },
    { value: 'DIGITEVEN', label: 'Even' },
    { value: 'DIGITODD', label: 'Odd' },
    { value: 'DIGITOVER', label: 'Over' },
    { value: 'DIGITUNDER', label: 'Under' },
    { value: 'DIGITMATCH', label: 'Matches' },
    { value: 'DIGITDIFF', label: 'Differs' },
];

const ManualTrader = () => {
    const [market, setMarket] = useState('R_75');
    const [contractType, setContractType] = useState('CALL');
    const [stake, setStake] = useState(MIN_STAKE);
    const [duration, setDuration] = useState(5);
    const [durationUnit, setDurationUnit] = useState('t');
    const [prediction, setPrediction] = useState(5);

    const isDigitContract = [
        'DIGITEVEN',
        'DIGITODD',
        'DIGITOVER',
        'DIGITUNDER',
        'DIGITMATCH',
        'DIGITDIFF',
    ].includes(contractType);

    const handleBuy = () => {
        if (stake < MIN_STAKE) {
            setStake(MIN_STAKE);
        }
    };

    return (
        <div className='manual-trader'>
            <div className='manual-trader__header'>
                <div>
                    <h1>Manual Trader</h1>
                    <p>Trade directly from Nova Traders.</p>
                </div>
            </div>

            <div className='manual-trader__grid'>
                <section className='manual-trader__card'>
                    <h2>Trade</h2>

                    <label>
                        Market
                        <select
                            value={market}
                            onChange={event => setMarket(event.target.value)}
                        >
                            {MARKETS.map(item => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className='manual-trader__field'>
                        <span>Contract</span>

                        <div className='manual-trader__contract-grid'>
                            {CONTRACTS.map(contract => (
                                <button
                                    key={contract.value}
                                    type='button'
                                    className={
                                        contractType === contract.value
                                            ? 'manual-trader__contract active'
                                            : 'manual-trader__contract'
                                    }
                                    onClick={() => setContractType(contract.value)}
                                >
                                    {contract.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='manual-trader__row'>
                        <label>
                            Stake
                            <input
                                type='number'
                                min={MIN_STAKE}
                                step='0.01'
                                value={stake}
                                onChange={event =>
                                    setStake(
                                        Math.max(
                                            MIN_STAKE,
                                            Number(event.target.value)
                                        )
                                    )
                                }
                            />
                            <small>Minimum stake: 0.35</small>
                        </label>

                        <label>
                            Duration
                            <input
                                type='number'
                                min='1'
                                value={duration}
                                onChange={event =>
                                    setDuration(
                                        Math.max(1, Number(event.target.value))
                                    )
                                }
                            />
                        </label>

                        <label>
                            Unit
                            <select
                                value={durationUnit}
                                onChange={event =>
                                    setDurationUnit(event.target.value)
                                }
                            >
                                <option value='t'>Ticks</option>
                                <option value='s'>Seconds</option>
                                <option value='m'>Minutes</option>
                            </select>
                        </label>
                    </div>

                    {isDigitContract && (
                        <label>
                            Prediction
                            <select
                                value={prediction}
                                onChange={event =>
                                    setPrediction(Number(event.target.value))
                                }
                            >
                                {Array.from({ length: 10 }, (_, digit) => (
                                    <option key={digit} value={digit}>
                                        {digit}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <button
                        type='button'
                        className='manual-trader__buy'
                        onClick={handleBuy}
                    >
                        BUY
                    </button>
                </section>

                <section className='manual-trader__card'>
                    <h2>Open Contract</h2>

                    <div className='manual-trader__empty'>
                        <strong>No open contract</strong>
                        <span>Your active trade will appear here.</span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ManualTrader;
