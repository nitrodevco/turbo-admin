import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { LoginPage } from '#/auth/LoginPage';
import { RequireSession } from '#/auth/RequireSession';
import { SetupPage } from '#/auth/SetupPage';
import { Loading } from '#/components/ui';
import { Shell } from '#/layout/Shell';
import { AccountPage } from '#/pages/AccountPage';
import { CatalogPage } from '#/pages/catalog/CatalogPage';
import { ChatlogPage } from '#/pages/ChatlogPage';
import { CommandLogPage } from '#/pages/CommandLogPage';
import { ConsolePage } from '#/pages/ConsolePage';
import { DashboardPage } from '#/pages/DashboardPage';
import { GamedataPage } from '#/pages/gamedata/GamedataPage';
import { GroupPage } from '#/pages/permissions/GroupPage';
import { GroupsPage } from '#/pages/permissions/GroupsPage';
import { LogPage, NodesPage, SearchPage } from '#/pages/permissions/LookupPages';
import { PlayerPage } from '#/pages/permissions/PlayerPage';
import { PlayersPage } from '#/pages/permissions/PlayersPage';
import { PlayerPage as PlayerProfilePage } from '#/pages/players/PlayerPage';
import { PlayersPage as PlayerListPage } from '#/pages/players/PlayersPage';
import { RoomPage } from '#/pages/rooms/RoomPage';
import { RoomSettingsPage } from '#/pages/rooms/RoomSettingsPage';
import { RoomsPage } from '#/pages/rooms/RoomsPage';
import { StaffPage } from '#/pages/StaffPage';

// Its charts are a large library that no other page needs, so it loads when opened.
const PerformancePage = lazy(() => import('#/pages/PerformancePage').then(x => ({ default: x.PerformancePage })));

export const App = () => (
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<RequireSession><Shell /></RequireSession>}>
            <Route index element={<DashboardPage />} />
            <Route path="performance" element={<Suspense fallback={<Loading />}><PerformancePage /></Suspense>} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="rooms/:id" element={<RoomPage />} />
            <Route path="rooms/:id/settings" element={<RoomSettingsPage />} />
            <Route path="players" element={<PlayerListPage />} />
            <Route path="players/:id" element={<PlayerProfilePage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="gamedata" element={<GamedataPage />} />
            <Route path="command-log" element={<CommandLogPage />} />
            <Route path="chatlog" element={<ChatlogPage />} />
            <Route path="console" element={<ConsolePage />} />
            <Route path="permissions" element={<Navigate to="/permissions/groups" replace />} />
            <Route path="permissions/groups" element={<GroupsPage />} />
            <Route path="permissions/groups/:name" element={<GroupPage />} />
            <Route path="permissions/players" element={<PlayersPage />} />
            <Route path="permissions/players/:id" element={<PlayerPage />} />
            <Route path="permissions/search" element={<SearchPage />} />
            <Route path="permissions/log" element={<LogPage />} />
            <Route path="permissions/nodes" element={<NodesPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
);
