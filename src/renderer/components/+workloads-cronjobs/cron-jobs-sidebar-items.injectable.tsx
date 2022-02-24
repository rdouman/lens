/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";

import cronJobsRouteInjectable from "./cron-jobs-route.injectable";
import navigateToRouteInjectable from "../../routes/navigate-to-route.injectable";
import currentRouteInjectable from "../../routes/current-route.injectable";
import { workloadsSidebarItemId } from "../+workloads/workloads-sidebar-items.injectable";
import { sidebarItemsInjectionToken } from "../layout/sidebar-items.injectable";

const cronJobsSidebarItemsInjectable = getInjectable({
  id: "cron-jobs-sidebar-items",

  instantiate: (di) => {
    const route = di.inject(cronJobsRouteInjectable);
    const currentRoute = di.inject(currentRouteInjectable);
    const navigateToRoute = di.inject(navigateToRouteInjectable);

    return computed(() => [
      {
        id: "cron-jobs",
        parentId: workloadsSidebarItemId,
        title: "CronJobs",
        onClick: () => navigateToRoute(route),
        isActive: route === currentRoute.get(),
        isVisible: route.isEnabled(),
        priority: 80,
      },
    ]);
  },

  injectionToken: sidebarItemsInjectionToken,
});

export default cronJobsSidebarItemsInjectable;