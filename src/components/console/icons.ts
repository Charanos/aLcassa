import {
  IconActivityHeartbeat,
  IconBuildings,
  IconCoin,
  IconFileText,
  IconHistory,
  IconLayoutDashboard,
  IconLayoutList,
  IconPlus,
  IconSettings,
  IconShieldLock,
  IconUser,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

/**
 * One icon per concept, resolved centrally.
 *
 * 03 §7a: "A concept rendered with two different icons in two places is a bug
 * rather than a preference." The design file carries its own inline path data
 * because a single-document preview cannot import a package; here the same map
 * points at Tabler, which is the icon set the rest of the product already uses.
 *
 * Nav items and palette hits both name icons as strings so the navigation
 * definition stays a plain serialisable object — it is built in a SERVER
 * component and handed to a client one, and a React element in that payload
 * would force the whole nav definition across the boundary as rendered output
 * rather than as data.
 */
export const CONSOLE_ICONS: Record<string, TablerIcon> = {
  dashboard: IconLayoutDashboard,
  building: IconBuildings,
  list: IconLayoutList,
  coin: IconCoin,
  file: IconFileText,
  pulse: IconActivityHeartbeat,
  history: IconHistory,
  users: IconUsers,
  shield: IconShieldLock,
  sliders: IconSettings,
  plus: IconPlus,
  user: IconUser,
};
