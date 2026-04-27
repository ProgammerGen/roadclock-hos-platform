import { Route as RootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as LogsRoute } from "./routes/logs";
import { Route as CalculatorRoute } from "./routes/calculator";
import { Route as DailyLogRoute } from "./routes/daily-log";
import { Route as ExportRoute } from "./routes/export";
import { Route as RODSHistoryRoute } from "./routes/rods-history";

const routeTreeKey = "__roadclock_route_tree__";
type RouteTree = ReturnType<typeof RootRoute.addChildren>;
type RootChildRoute = [unknown, string];

function attachToRoot(route: unknown, path: string) {
  return (route as { update: (options: unknown) => unknown }).update({
    getParentRoute: () => RootRoute,
    path,
  } as const);
}

const ROOT_CHILDREN: RootChildRoute[] = [
  [IndexRoute, "/"],
  [LogsRoute, "/logs"],
  [CalculatorRoute, "/calculator"],
  [DailyLogRoute, "/daily-log"],
  [ExportRoute, "/export"],
  [RODSHistoryRoute, "/rods-history"],
];

export const ROUTE_SIGNATURE = ROOT_CHILDREN.map(([, path]) => path).join("|");

const routeTreeCache = globalThis as typeof globalThis & {
  [routeTreeKey]?: {
    signature: string;
    tree: RouteTree;
  };
};

const cachedRouteTree = routeTreeCache[routeTreeKey];

if (!cachedRouteTree || cachedRouteTree.signature !== ROUTE_SIGNATURE) {
  const tree = (
    RootRoute as unknown as {
      addChildren: (children: unknown) => RouteTree;
    }
  ).addChildren(
    ROOT_CHILDREN.map(([route, path]) => attachToRoot(route, path)),
  );

  routeTreeCache[routeTreeKey] = {
    signature: ROUTE_SIGNATURE,
    tree,
  };
}

export const routeTree = routeTreeCache[routeTreeKey]!.tree;
