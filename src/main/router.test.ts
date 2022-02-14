/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import routerInjectable, { routeInjectionToken } from "./router/router.injectable";
import { getDiForUnitTesting } from "./getDiForUnitTesting";
import type { Router, RouteHandler, Route } from "./router";
import type { Cluster } from "../common/cluster/cluster";
import { Request } from "mock-http";
import { getInjectable } from "@ogre-tools/injectable";
import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import parseRequestInjectable from "./router/parse-request.injectable";
import { contentTypes } from "./router-content-types";

describe("router", () => {
  let router: Router;
  let routeHandlerMock: AsyncFnMock<RouteHandler<any>>;

  beforeEach(async () => {
    routeHandlerMock = asyncFn();

    const di = getDiForUnitTesting({ doGeneralOverrides: true });

    di.override(parseRequestInjectable, () => () => Promise.resolve({ payload: "some-payload" }));

    await di.runSetups();

    di.register(getInjectable({
      id: "some-route",

      instantiate: (): Route<any> => ({
        method: "get",
        path: "/some-path",

        // @ts-ignore
        handler: routeHandlerMock,
      }),

      injectionToken: routeInjectionToken,
    }));

    router = di.inject(routerInjectable);
  });

  describe("when navigating to the route", () => {
    let actualPromise: Promise<boolean>;
    let clusterStub: Cluster;
    let requestStub: Request;
    let responseStub: any;

    beforeEach(() => {
      requestStub = new Request({
        url: "/some-path",
        method: "get",
        headers: {
          "content-type": "application/json",
        },
      });

      // @ts-ignore
      responseStub = { end: jest.fn(), setHeader: jest.fn(), write: jest.fn(), statusCode: undefined };

      clusterStub = {} as Cluster;

      actualPromise = router.route(clusterStub, requestStub, responseStub);
    });

    it("calls handler with the request", () => {
      expect(routeHandlerMock).toHaveBeenCalledWith({
        cluster: clusterStub,
        params: {},
        path: "/some-path",
        payload: "some-payload",
        query: expect.any(URLSearchParams),
        raw: { req: requestStub },
        response: responseStub,
      });
    });

    it("given no content-type is specified, when handler resolves, resolves with JSON", async () => {
      await routeHandlerMock.resolve({ response: "some-response-from-route-handler" });

      await actualPromise;

      expect(responseStub.setHeader.mock.calls).toEqual([
        ["Content-Type", "application/json"],
      ]);
    });

    it("given JSON content-type is specified, when handler resolves with object, resolves with JSON", async () => {
      await routeHandlerMock.resolve({ response: { some: "object" }});

      await actualPromise;

      expect(responseStub.end).toHaveBeenCalledWith('{"some":"object"}');
    });

    [
      { contentType: "text/plain", contentTypeObject: contentTypes.txt },
      { contentType: "application/json", contentTypeObject: contentTypes.json },
      { contentType: "text/html", contentTypeObject: contentTypes.html },
      { contentType: "text/css", contentTypeObject: contentTypes.css },
      { contentType: "image/gif", contentTypeObject: contentTypes.gif },
      { contentType: "image/jpeg", contentTypeObject: contentTypes.jpg },
      { contentType: "image/png", contentTypeObject: contentTypes.png },
      { contentType: "image/svg+xml", contentTypeObject: contentTypes.svg },
      { contentType: "application/javascript", contentTypeObject: contentTypes.js },
      { contentType: "font/woff2", contentTypeObject: contentTypes.woff2 },
      { contentType: "font/ttf", contentTypeObject: contentTypes.ttf },
    ].forEach(scenario => {
      describe(`given content type is "${scenario.contentType}", when handler resolves with response`, () => {
        beforeEach(async () => {
          await routeHandlerMock.resolve({ response: "some-response", contentType: scenario.contentTypeObject });

          await actualPromise;
        });

        it("has content type specific headers", () => {
          expect(responseStub.setHeader.mock.calls).toEqual([
            ["Content-Type", scenario.contentType],
          ]);
        });

        it("defaults to successful status code", () => {
          expect(responseStub.statusCode).toBe(200);
        });

        it("has response as body", () => {
          expect(responseStub.end).toHaveBeenCalledWith("some-response");
        });
      });

      it(`given content type is "${scenario.contentType}", when handler resolves with success and custom status code, defaults to "200" as status code`, async () => {
        await routeHandlerMock.resolve({
          response: "some-response",
          statusCode: 204,
          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.statusCode).toBe(204);
      });

      it(`given content type is "${scenario.contentType}", when handler resolves with success but without status code, defaults to "200" as status code`, async () => {
        await routeHandlerMock.resolve({
          response: "some-response",
          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.statusCode).toBe(200);
      });


      it(`given content type is "${scenario.contentType}", when handler resolves without response, has no body`, async () => {
        await routeHandlerMock.resolve({
          response: undefined,
          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.end).toHaveBeenCalledWith(undefined);
      });

      it(`given content type is "${scenario.contentType}", when handler resolves with error, has error as body`, async () => {
        await routeHandlerMock.resolve({
          error: "some-error",
          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.end).toHaveBeenCalledWith("some-error");
      });

      it(`given content type is "${scenario.contentType}", when handler resolves with error and status code, has custom status code`, async () => {
        await routeHandlerMock.resolve({
          error: "some-error",
          statusCode: 414,
          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.statusCode).toBe(414);
      });

      it(`given content type is "${scenario.contentType}", when handler resolves with error but without status code, defaults to "400" as status code`, async () => {
        await routeHandlerMock.resolve({
          error: "some-error",
          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.statusCode).toBe(400);
      });

      it(`given content type is "${scenario.contentType}", when handler resolves custom headers, resolves with content type specific headers and custom headers`, async () => {
        await routeHandlerMock.resolve({
          response: "irrelevant",

          headers: {
            "Content-Type": "some-content-type-to-be-overridden",
            "Some-Header": "some-header-value",
          },

          contentType: scenario.contentTypeObject,
        });

        await actualPromise;

        expect(responseStub.setHeader.mock.calls).toEqual([
          ["Content-Type", scenario.contentType],
          ["Some-Header", "some-header-value"],
        ]);

      });

      describe(`given content type is "${scenario.contentType}", when handler resolves with binary content`, () => {
        let responseBufferStub: Buffer;

        beforeEach(async () => {
          responseBufferStub = Buffer.from("some-binary-content");

          await routeHandlerMock.resolve({
            response: responseBufferStub,
            contentType: scenario.contentTypeObject,
          });

          await actualPromise;
        });

        it("writes binary content to response", () => {
          expect(responseStub.write).toHaveBeenCalledWith(responseBufferStub);
        });

        it("does not end with the response", () => {
          expect(responseStub.end.mock.calls[0]).toEqual([]);
        });
      });
    });
  });
});