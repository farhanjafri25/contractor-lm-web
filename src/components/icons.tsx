'use client';

import { CentralIcon } from '@central-icons-react/all';
import type { ComponentProps } from 'react';

type CentralGlyphName =
    | 'IconArrowBoxLeft'
    | 'IconArrowLeft'
    | 'IconArrowRotateCounterClockwise'
    | 'IconArrowRotateLeftRight'
    | 'IconCalendar1'
    | 'IconCircleCheck'
    | 'IconCirclePlus'
    | 'IconCircleX'
    | 'IconClock'
    | 'IconExclamationTriangle'
    | 'IconEyeOpen'
    | 'IconEyeSlash'
    | 'IconFileText'
    | 'IconLayoutDashboard'
    | 'IconLiveActivity'
    | 'IconMagnifyingGlass'
    | 'IconMoon'
    | 'IconSettingsGear2'
    | 'IconShieldBreak'
    | 'IconShieldCheck'
    | 'IconShieldCrossed'
    | 'IconSun'
    | 'IconTeam'
    | 'IconTrending1'
    | 'IconUserAdd'
    | 'IconX';

type AppIconProps = Omit<ComponentProps<typeof CentralIcon>, 'name' | 'join' | 'fill' | 'radius' | 'stroke'>;

function createIcon(name: CentralGlyphName) {
    function AppIcon(props: AppIconProps) {
        return (
            <CentralIcon
                name={name}
                join="round"
                fill="outlined"
                radius="1"
                stroke="1.5"
                {...props}
            />
        );
    }

    AppIcon.displayName = name;
    return AppIcon;
}

export const Activity = createIcon('IconLiveActivity');
export const AlertTriangle = createIcon('IconExclamationTriangle');
export const ArrowLeft = createIcon('IconArrowLeft');
export const Calendar = createIcon('IconCalendar1');
export const CheckCheck = createIcon('IconCircleCheck');
export const CheckCircle = createIcon('IconCircleCheck');
export const Clock = createIcon('IconClock');
export const Eye = createIcon('IconEyeOpen');
export const EyeOff = createIcon('IconEyeSlash');
export const FileText = createIcon('IconFileText');
export const LayoutDashboard = createIcon('IconLayoutDashboard');
export const LogOut = createIcon('IconArrowBoxLeft');
export const Moon = createIcon('IconMoon');
export const Plus = createIcon('IconCirclePlus');
export const RefreshCw = createIcon('IconArrowRotateLeftRight');
export const RotateCcw = createIcon('IconArrowRotateCounterClockwise');
export const Search = createIcon('IconMagnifyingGlass');
export const Settings = createIcon('IconSettingsGear2');
export const ShieldAlert = createIcon('IconShieldBreak');
export const ShieldCheck = createIcon('IconShieldCheck');
export const ShieldOff = createIcon('IconShieldCrossed');
export const Sun = createIcon('IconSun');
export const TrendingUp = createIcon('IconTrending1');
export const UserPlus = createIcon('IconUserAdd');
export const Users = createIcon('IconTeam');
export const X = createIcon('IconX');
export const XCircle = createIcon('IconCircleX');
