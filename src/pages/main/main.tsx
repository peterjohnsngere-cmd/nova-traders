 // @ts-nocheck — vendored bot code with known upstream type gaps; see AGENTS.md
import React, { lazy, Suspense, useEffect, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from 'react-router';
import ChunkLoader from '@/components/loader/chunk-loader';
import { generateOAuthURL } from '@/components/shared';
import DesktopWrapper from '@/components/shared_ui/desktop-wrapper';
import Dialog from '@/components/shared_ui/dialog';
import MobileWrapper from '@/components/shared_ui/mobile-wrapper';
import Tabs from '@/components/shared_ui/tabs/tabs';
import TradeTypeConfirmationModal from '@/components/trade-type-confirmation-modal';
import TradingViewModal from '@/components/trading-view-chart/trading-view-modal';
import { api_base, updateWorkspaceName } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import {
    disableUrlParameterApplication,
    enableUrlParameterApplication,
    setupTradeTypeChangeListener,
} from '@/utils/blockly-url-param-handler';
import {
    checkAndShowTradeTypeModal,
    getModalState,
    handleTradeTypeCancel,
    handleTradeTypeConfirm,
    resetUrlParamProcessing,
    setModalStateChangeCallback,
} from '@/utils/trade-type-modal-handler';
import {
    LabelPairedChartLineCaptionRegularIcon,
    LabelPairedObjectsColumnCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { LegacyGuide1pxIcon } from '@deriv/quill-icons/Legacy';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

import RunPanel from '../../components/run-panel';
import ChartModal from '../chart/chart-modal';
import Dashboard from '../dashboard';
import ManualTrader from '../manual-trader/manual-trader';
import AnalysisTool from '../analysis-tool/analysis-tool';
import BotPage from '../bot-page/bot-page';
import BotEditor from '../bot-editor/bot-editor';
import RunStrategy from '../dashboard/run-strategy';

import './main.scss';

const ChartWrapper = lazy(
    () => import('../chart/chart-wrapper')
);

const Tutorial = lazy(
    () => import('../tutorials')
);

/*
 * IMPORTANT
 *
 * Bot Builder is intentionally NOT a main navigation tab.
 *
 * The Blockly builder code remains installed and available
 * to the existing Deriv bot-building system, but it is no
 * longer displayed as a navigation item here.
 *
 * Main navigation:
 *
 * 0 Dashboard
 * 1 Analysis Tool
 * 2 Bots
 * 3 Bot Editor
 * 4 Manual Trader
 * 5 Charts
 * 6 Tutorials
 */
const MAIN_TAB_IDS = [
    'id-dbot-dashboard',
    'id-analysis-tool',
    'id-bot-page',
    'id-bot-editor',
    'id-manual-trader',
    'id-charts',
    'id-tutorials',
];

const MAIN_TAB_INDEX = {
    DASHBOARD: 0,
    ANALYSIS_TOOL: 1,
    BOTS: 2,
    BOT_EDITOR: 3,
    MANUAL_TRADER: 4,
    CHART: 5,
    TUTORIAL: 6,
};

const HASHES = [
    'dashboard',
    'analysis_tool',
    'bots',
    'bot_editor',
    'manual_trader',
    'chart',
    'tutorial',
];

type SelectedBot = {
    id: string;
    name: string;
};

const BOT_NAMES: Record<string, string> = {
    pulse: 'Pulse Bot',
    volt: 'Volt Bot',
    cipher: 'Cipher Bot',
    vector: 'Vector Bot',
    nexus: 'Nexus Bot',
    prime: 'Prime Bot',
    orbit: 'Orbit Bot',
};

const AppWrapper = observer(() => {
    const { connectionStatus } = useApiBase();

    const {
        dashboard,
        load_modal,
        run_panel,
        quick_strategy,
        summary_card,
        blockly_store,
    } = useStore();

    const { is_loading } = blockly_store;

    const {
        active_tab,
        active_tour,
        is_chart_modal_visible,
        is_trading_view_modal_visible,
        setActiveTab,
        setWebSocketState,
        setActiveTour,
        setTourDialogVisibility,
    } = dashboard;

    const { dashboard_strategies } = load_modal;

    const {
        is_dialog_open,
        is_drawer_open,
        dialog_options,
        onCancelButtonClick,
        onCloseDialog,
        onOkButtonClick,
        stopBot,
    } = run_panel;

    const { is_open } = quick_strategy;

    const {
        cancel_button_text,
        ok_button_text,
        title,
        message,
        dismissable,
        is_closed_on_cancel,
    } = dialog_options as {
        [key: string]: string;
    };

    const { clear } = summary_card;

    /*
     * The currently selected standalone bot.
     *
     * Bots -> Pulse -> Bot Editor = Pulse
     * Bots -> Volt  -> Bot Editor = Volt
     */
    const [selectedBot, setSelectedBot] = useState<SelectedBot>({
        id: 'pulse',
        name: 'Pulse Bot',
    });

    const init_render = React.useRef(true);

    const { isDesktop } = useDevice();

    const location = useLocation();
    const navigate = useNavigate();

    const [left_tab_shadow, setLeftTabShadow] = useState(false);
    const [right_tab_shadow, setRightTabShadow] = useState(false);

    const [tradeTypeModalState, setTradeTypeModalState] = useState(
        getModalState()
    );

    const is_preview_mode = window.location.pathname.includes('/preview');

    /*
     * Read URL hash.
     */
    const getHashedValue = (tab: number) => {
        const hashValue = location.hash?.split('#')[1];

        if (!hashValue) {
            return is_preview_mode
                ? MAIN_TAB_INDEX.DASHBOARD
                : tab;
        }

        const hashIndex = HASHES.indexOf(hashValue);

        if (hashIndex >= 0) {
            return hashIndex;
        }

        return tab;
    };

    const active_hash_tab = getHashedValue(active_tab);

    /*
     * Trade type modal props.
     */
    const getTradeTypeModalProps = () => {
        const { tradeTypeData } = tradeTypeModalState;

        return {
            is_visible: tradeTypeModalState.isVisible,

            trade_type_display_name:
                tradeTypeData?.displayName || '',

            current_trade_type: tradeTypeData?.currentTradeType
                ? `${tradeTypeData.currentTradeType.tradeTypeCategory}/${tradeTypeData.currentTradeType.tradeType}`
                : 'N/A',

            current_trade_type_display_name:
                tradeTypeData?.currentTradeTypeDisplayName || 'N/A',

            onConfirm: handleTradeTypeConfirm,
            onCancel: handleTradeTypeCancel,
        };
    };

    /*
     * Trade type modal listener.
     *
     * This remains here because the existing Blockly builder
     * still uses the Deriv trade-type system.
     */
    React.useEffect(() => {
        setModalStateChangeCallback(new_state => {
            setTradeTypeModalState(new_state);
        });
    }, [is_loading]);

    /*
     * URL parameter reset.
     */
    React.useEffect(() => {
        resetUrlParamProcessing();
    }, [location.search]);

    /*
     * Tab shadows.
     */
    React.useEffect(() => {
        const el_dashboard = document.getElementById(
            'id-dbot-dashboard'
        );

        const el_tutorial = document.getElementById(
            'id-tutorials'
        );

        const observer_dashboard =
            new window.IntersectionObserver(
                ([entry]) => {
                    setLeftTabShadow(!entry.isIntersecting);
                },
                {
                    root: null,
                    threshold: 0.5,
                }
            );

        const observer_tutorial =
            new window.IntersectionObserver(
                ([entry]) => {
                    setRightTabShadow(!entry.isIntersecting);
                },
                {
                    root: null,
                    threshold: 0.5,
                }
            );

        if (el_dashboard) {
            observer_dashboard.observe(el_dashboard);
        }

        if (el_tutorial) {
            observer_tutorial.observe(el_tutorial);
        }

        return () => {
            observer_dashboard.disconnect();
            observer_tutorial.disconnect();
        };
    });

    /*
     * WebSocket connection handling.
     */
    React.useEffect(() => {
        if (
            connectionStatus !== CONNECTION_STATUS.OPENED
        ) {
            const is_bot_running =
                document.getElementById(
                    'db-animation__stop-button'
                ) !== null;

            if (is_bot_running) {
                clear();
                stopBot();
                api_base.setIsRunning(false);
                setWebSocketState(false);
            }
        }
    }, [
        clear,
        connectionStatus,
        setWebSocketState,
        stopBot,
    ]);

    /*
     * Existing Blockly trade-type handling.
     *
     * The builder is no longer a navigation tab, so this
     * logic only runs when the underlying Blockly system
     * explicitly activates its builder state.
     */
    React.useEffect(() => {
        let pollTimeoutId:
            ReturnType<typeof setTimeout> | null = null;

        /*
         * Do not run builder UI logic for the standalone
         * Nova Traders tabs.
         */
        return () => {
            if (pollTimeoutId) {
                clearTimeout(pollTimeoutId);
            }
        };
    }, [is_loading]);

    /*
     * Handle the old BotPage route.
     *
     * BotPage may still call:
     *
     * navigate('/bot-editor', {
     *     state: {
     *         botId,
     *         botName
     *     }
     * })
     *
     * We convert that into the new main-tab system.
     */
    React.useEffect(() => {
        const routeState =
            location.state as {
                botId?: string;
                botName?: string;
            } | null;

        if (
            routeState?.botId &&
            BOT_NAMES[routeState.botId]
        ) {
            setSelectedBot({
                id: routeState.botId,
                name:
                    routeState.botName ||
                    BOT_NAMES[routeState.botId],
            });

            setActiveTab(
                MAIN_TAB_INDEX.BOT_EDITOR
            );

            /*
             * Clear the old route state while keeping
             * the application inside the main interface.
             */
            navigate(
                {
                    pathname: location.pathname,
                    search: location.search,
                    hash: '#bot_editor',
                },
                {
                    replace: true,
                    state: null,
                }
            );
        }
    }, [
        location.state,
        location.pathname,
        location.search,
        navigate,
        setActiveTab,
    ]);

    /*
     * Keep URL hash synchronized with active tab.
     */
    React.useEffect(() => {
        if (is_open) {
            setTourDialogVisibility(false);
        }

        if (init_render.current) {
            const initialTab = Number(active_hash_tab);

            setActiveTab(
                initialTab >= 0
                    ? initialTab
                    : MAIN_TAB_INDEX.DASHBOARD
            );

            init_render.current = false;
        } else {
            const currentSearch = window.location.search;

            const nextHash =
                HASHES[active_tab] ||
                HASHES[MAIN_TAB_INDEX.DASHBOARD];

            navigate(
                `${currentSearch}#${nextHash}`,
                {
                    replace: true,
                }
            );
        }

        if (active_tour !== '') {
            setActiveTour('');
        }

        const mainElement =
            document.querySelector('.main__container');

        if (
            active_tab === MAIN_TAB_INDEX.TUTORIAL &&
            !isDesktop
        ) {
            document.body.style.overflow = 'hidden';

            if (
                mainElement instanceof HTMLElement
            ) {
                mainElement.classList.add(
                    'no-scroll'
                );
            }
        } else {
            document.body.style.overflow = '';

            if (
                mainElement instanceof HTMLElement
            ) {
                mainElement.classList.remove(
                    'no-scroll'
                );
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active_tab]);

    /*
     * Blockly trashcan positioning.
     *
     * Kept for compatibility with the existing
     * Blockly builder system.
     */
    React.useEffect(() => {
        return () => {};
    }, [active_tab, is_drawer_open]);

    /*
     * Workspace name update.
     */
    useEffect(() => {
        let timer:
            ReturnType<typeof setTimeout>;

        if (dashboard_strategies.length > 0) {
            timer = setTimeout(() => {
                updateWorkspaceName();
            });
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [
        dashboard_strategies,
        active_tab,
    ]);

    /*
     * OPEN STANDALONE BOT
     *
     * Bots -> selected bot -> Bot Editor.
     *
     * This no longer navigates to a separate
     * /bot-editor page.
     */
    const handleOpenBot =
        React.useCallback(
            (bot: {
                id: string;
                name?: string;
            }) => {
                const botName =
                    bot.name ||
                    BOT_NAMES[bot.id] ||
                    'Bot';

                setSelectedBot({
                    id: bot.id,
                    name: botName,
                });

                setActiveTab(
                    MAIN_TAB_INDEX.BOT_EDITOR
                );

                window.setTimeout(() => {
                    document
                        .getElementById(
                            'id-bot-editor'
                        )
                        ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center',
                        });
                }, 10);
            },
            [setActiveTab]
        );

    /*
     * MAIN TAB CHANGE.
     */
    const handleTabChange =
        React.useCallback(
            (tab_index: number) => {
                if (
                    tab_index < 0 ||
                    tab_index >=
                        MAIN_TAB_IDS.length
                ) {
                    return;
                }

                setActiveTab(tab_index);

                const el_id =
                    MAIN_TAB_IDS[tab_index];

                if (el_id) {
                    window.setTimeout(() => {
                        document
                            .getElementById(
                                el_id
                            )
                            ?.scrollIntoView({
                                behavior:
                                    'smooth',
                                block: 'center',
                                inline: 'center',
                            });
                    }, 10);
                }
            },
            [setActiveTab]
        );

    /*
     * OAuth login.
     */
    const handleLoginGeneration =
        async () => {
            const oauthUrl =
                await generateOAuthURL();

            if (oauthUrl) {
                window.location.replace(
                    oauthUrl
                );
            } else {
                console.error(
                    'Failed to generate OAuth URL'
                );
            }
        };

    return (
        <React.Fragment>
            <div className='main'>
                <div
                    className={classNames(
                        'main__container',
                        {
                            'main__container--active':
                                active_tour &&
                                active_tab ===
                                    MAIN_TAB_INDEX.DASHBOARD &&
                                !isDesktop,
                        }
                    )}
                >
                    <div>
                        {!isDesktop &&
                            left_tab_shadow && (
                                <span className='tabs-shadow tabs-shadow--left' />
                            )}

                        <Tabs
                            active_index={
                                active_tab
                            }
                            className='main__tabs'
                            onTabItemClick={
                                handleTabChange
                            }
                            top
                        >
                            {/* DASHBOARD */}
                            <div
                                label={
                                    <>
                                        <LabelPairedObjectsColumnCaptionRegularIcon
                                            height='24px'
                                            width='24px'
                                            fill='var(--text-general)'
                                        />

                                        <Localize i18n_default_text='Dashboard' />
                                    </>
                                }
                                id='id-dbot-dashboard'
                            >
                                <Dashboard
                                    handleTabChange={
                                        handleTabChange
                                    }
                                />
                            </div>

                            {/* ANALYSIS TOOL */}
                            <div
                                label='Analysis Tool'
                                id='id-analysis-tool'
                            >
                                <AnalysisTool />
                            </div>

                            {/* BOTS */}
                            <div
                                label='Bots'
                                id='id-bot-page'
                            >
                                <BotPage
                                    onOpenBot={
                                        handleOpenBot
                                    }
                                />
                            </div>

                            {/* BOT EDITOR */}
                            <div
                                label='Bot Editor'
                                id='id-bot-editor'
                            >
                                <BotEditor
                                    selectedBotId={
                                        selectedBot.id
                                    }
                                    selectedBotName={
                                        selectedBot.name
                                    }
                                />
                            </div>

                            {/* MANUAL TRADER */}
                            <div
                                label='Manual Trader'
                                id='id-manual-trader'
                            >
                                <ManualTrader />
                            </div>

                            {/* CHARTS */}
                            <div
                                label={
                                    <>
                                        <LabelPairedChartLineCaptionRegularIcon
                                            height='24px'
                                            width='24px'
                                            fill='var(--text-general)'
                                        />

                                        <Localize i18n_default_text='Charts' />
                                    </>
                                }
                                id={
                                    is_chart_modal_visible ||
                                    is_trading_view_modal_visible
                                        ? 'id-charts--disabled'
                                        : 'id-charts'
                                }
                            >
                                <Suspense
                                    fallback={
                                        <ChunkLoader
                                            message={localize(
                                                'Please wait, loading chart...'
                                            )}
                                        />
                                    }
                                >
                                    <ChartWrapper
                                        show_digits_stats={
                                            false
                                        }
                                    />
                                </Suspense>
                            </div>

                            {/* TUTORIALS */}
                            <div
                                label={
                                    <>
                                        <LegacyGuide1pxIcon
                                            height='16px'
                                            width='16px'
                                            fill='var(--text-general)'
                                            className='icon-general-fill-g-path'
                                        />

                                        <Localize i18n_default_text='Tutorials' />
                                    </>
                                }
                                id='id-tutorials'
                            >
                                <div className='tutorials-wrapper'>
                                    <Suspense
                                        fallback={
                                            <ChunkLoader
                                                message={localize(
                                                    'Please wait, loading tutorials...'
                                                )}
                                            />
                                        }
                                    >
                                        <Tutorial
                                            handleTabChange={
                                                handleTabChange
                                            }
                                        />
                                    </Suspense>
                                </div>
                            </div>
                        </Tabs>

                        {!isDesktop &&
                            right_tab_shadow && (
                                <span className='tabs-shadow tabs-shadow--right' />
                            )}
                    </div>
                </div>
            </div>

            <DesktopWrapper>
                <div className='main__run-strategy-wrapper'>
                    <RunStrategy />
                    <RunPanel />
                </div>

                <ChartModal />

                <TradingViewModal />
            </DesktopWrapper>

            <MobileWrapper>
                {!is_open && (
                    <RunPanel />
                )}
            </MobileWrapper>

            <Dialog
                cancel_button_text={
                    cancel_button_text ||
                    localize('Cancel')
                }
                className='dc-dialog__wrapper--fixed'
                confirm_button_text={
                    ok_button_text ||
                    localize('Ok')
                }
                has_close_icon
                is_mobile_full_width={false}
                is_visible={is_dialog_open}
                onCancel={
                    onCancelButtonClick
                }
                onClose={onCloseDialog}
                onConfirm={
                    onOkButtonClick ||
                    onCloseDialog
                }
                portal_element_id='modal_root'
                title={title}
                login={handleLoginGeneration}
                dismissable={dismissable}
                is_closed_on_cancel={
                    is_closed_on_cancel
                }
            >
                {message}
            </Dialog>

            {/* Trade Type Confirmation Modal */}
            {(() => {
                const modalProps =
                    getTradeTypeModalProps();

                return (
                    <TradeTypeConfirmationModal
                        is_visible={
                            modalProps.is_visible
                        }
                        trade_type_display_name={
                            modalProps.trade_type_display_name
                        }
                        current_trade_type={
                            modalProps.current_trade_type
                        }
                        current_trade_type_display_name={
                            modalProps.current_trade_type_display_name
                        }
                        onConfirm={
                            modalProps.onConfirm
                        }
                        onCancel={
                            modalProps.onCancel
                        }
                    />
                );
            })()}
        </React.Fragment>
    );
});

export default AppWrapper;
