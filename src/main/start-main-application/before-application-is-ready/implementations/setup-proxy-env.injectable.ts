/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { beforeApplicationIsReadyInjectionToken } from "../before-application-is-ready-injection-token";
import getCommandLineSwitchInjectable from "../../../electron-app/get-command-line-switch.injectable";

const setupProxyEnvInjectable = getInjectable({
  id: "setup-proxy-env",

  instantiate: (di) => {
    const getCommandLineSwitch = di.inject(getCommandLineSwitchInjectable);

    return {
      run: () => {
        const switchValue = getCommandLineSwitch("proxy-server");

        let httpsProxy =
          process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "";

        delete process.env.HTTPS_PROXY;
        delete process.env.HTTP_PROXY;

        if (switchValue !== "") {
          httpsProxy = switchValue;
        }

        if (httpsProxy !== "") {
          process.env.APP_HTTPS_PROXY = httpsProxy;
        }

        if (getCommandLineSwitch("proxy-server") !== "") {
          process.env.HTTPS_PROXY = getCommandLineSwitch("proxy-server");
        }
      },
    };
  },

  injectionToken: beforeApplicationIsReadyInjectionToken,
});

export default setupProxyEnvInjectable;
