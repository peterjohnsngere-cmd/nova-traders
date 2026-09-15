type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    MANUAL_TRADER: 2,
    ANALYSIS_TOOL: 3,
    CHART: 4,
    TUTORIAL: 5,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-manual-trader',
    'id-analysis-tool',
    'id-charts',
    'id-tutorials',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
