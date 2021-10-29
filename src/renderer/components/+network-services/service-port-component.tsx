/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import "./service-port-component.scss";

import React from "react";
import { disposeOnUnmount, observer } from "mobx-react";
import type { Service, ServicePort } from "../../../common/k8s-api/endpoints";
import { observable, makeObservable, reaction } from "mobx";
import { cssNames } from "../../utils";
import { Notifications } from "../notifications";
import { Button } from "../button";
import { addPortForward, getPortForward, openPortForward, PortForwardDialog, portForwardStore, predictProtocol, removePortForward } from "../../port-forward";
import type { ForwardedPort } from "../../port-forward";
import { Spinner } from "../spinner";

interface Props {
  service: Service;
  port: ServicePort;
}

@observer
export class ServicePortComponent extends React.Component<Props> {
  @observable waiting = false;
  @observable forwardPort = 0;
  @observable isPortForwarded = false;

  constructor(props: Props) {
    super(props);
    makeObservable(this);
    this.checkExistingPortForwarding();
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      reaction(() => [portForwardStore.portForwards, this.props.service], () => this.checkExistingPortForwarding()),
    ]);
  }

  async checkExistingPortForwarding() {
    const { service, port } = this.props;
    const portForward: ForwardedPort = {
      kind: "service",
      name: service.getName(),
      namespace: service.getNs(),
      port: port.port,
      forwardPort: this.forwardPort,
    };

    let activePort: number;

    try {
      activePort = await getPortForward(portForward) ?? 0;
    } catch (error) {
      this.isPortForwarded = false;

      return;
    }

    this.forwardPort = activePort;
    this.isPortForwarded = activePort ? true : false;
  }

  async portForward() {
    const { service, port } = this.props;
    const portForward: ForwardedPort = {
      kind: "service",
      name: service.getName(),
      namespace: service.getNs(),
      port: port.port,
      forwardPort: this.forwardPort,
      protocol: predictProtocol(port.name),
    };

    this.waiting = true;

    try {
      this.forwardPort = await addPortForward(portForward);

      if (this.forwardPort) {
        portForward.forwardPort = this.forwardPort;
        openPortForward(portForward);
        this.isPortForwarded = true;
      }
    } catch (error) {
      Notifications.error(`Error occurred starting port-forward, the local port may not be available or the ${portForward.kind} ${portForward.name} may not be reachable`);
      this.checkExistingPortForwarding();
    } finally {
      this.waiting = false;
    }
  }

  async stopPortForward() {
    const { service, port } = this.props;
    const portForward: ForwardedPort = {
      kind: "service",
      name: service.getName(),
      namespace: service.getNs(),
      port: port.port,
      forwardPort: this.forwardPort,
    };

    this.waiting = true;

    try {
      await removePortForward(portForward);
      this.isPortForwarded = false;
    } catch (error) {
      Notifications.error(`Error occurred stopping the port-forward from port ${portForward.forwardPort}.`);
      this.checkExistingPortForwarding();
    } finally {
      this.waiting = false;
    }
  }

  render() {
    const { port, service } = this.props;

    const portForwardAction = async () => {
      if (this.isPortForwarded) {
        await this.stopPortForward();
      } else {
        const portForward: ForwardedPort = {
          kind: "service",
          name: service.getName(),
          namespace: service.getNs(),
          port: port.port,
          forwardPort: this.forwardPort,
          protocol: predictProtocol(port.name),
        };

        PortForwardDialog.open(portForward, { openInBrowser: true });
      }
    };

    return (
      <div className={cssNames("ServicePortComponent", { waiting: this.waiting })}>
        <span title="Open in a browser" onClick={() => this.portForward()}>
          {port.toString()}
        </span>
        <Button onClick={() => portForwardAction()}> {this.isPortForwarded ? "Stop" : "Forward..."} </Button>
        {this.waiting && (
          <Spinner />
        )}
      </div>
    );
  }
}