/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails oncall+relay
 */

'use strict';

require('RelayTestUtils').unmockRelay();

jest.dontMock('RelayRenderer');

const React = require('React');
const ReactDOM = require('ReactDOM');
const Relay = require('Relay');
const RelayQueryConfig = require('RelayQueryConfig');
const RelayRenderer = require('RelayRenderer');
const RelayStore = require('RelayStore');

describe('RelayRenderer.abort', () => {
  let MockComponent;
  let MockContainer;

  beforeEach(() => {
    jest.resetModuleRegistry();

    MockComponent = React.createClass({render: () => <div />});
    MockContainer = Relay.createContainer(MockComponent, {
      fragments: {},
    });

    const container = document.createElement('div');

    function render() {
      const queryConfig = RelayQueryConfig.genMockInstance();
      ReactDOM.render(
        <RelayRenderer Component={MockContainer} queryConfig={queryConfig} />,
        container
      );
      const index = RelayStore.primeCache.mock.calls.length - 1;
      return {
        abort: RelayStore.primeCache.mock.abort[index],
        request: RelayStore.primeCache.mock.requests[index],
      };
    }
    jest.addMatchers({
      toAbortOnUpdate() {
        const {abort, request} = render();
        this.actual(request);
        render();
        return abort.mock.calls.length > 0;
      },
      toAbortOnUnmount() {
        const {abort, request} = render();
        this.actual(request);
        ReactDOM.unmountComponentAtNode(container);
        return abort.mock.calls.length > 0;
      },
    });
  });

  it('aborts synchronously initiated queries', () => {
    function synchronousQueries(request) {
      // Requests are always asynchronous, so do nothing.
    }
    expect(synchronousQueries).toAbortOnUpdate();
    expect(synchronousQueries).toAbortOnUnmount();
  });

  it('aborts blocked queries', () => {
    function blockedQueries(request) {
      // Queries are blocked on asynchronous requests.
      request.block();
    }
    expect(blockedQueries).toAbortOnUpdate();
    expect(blockedQueries).toAbortOnUnmount();
  });

  it('aborts queries with fulfilled dependencies', () => {
    function readyQueries(request) {
      request.block();
      request.resolve();
    }
    expect(readyQueries).toAbortOnUpdate();
    expect(readyQueries).toAbortOnUnmount();
  });

  it('does not abort failed queries', () => {
    function failedQueries(request) {
      request.fail(new Error());
    }
    expect(failedQueries).not.toAbortOnUpdate();
    expect(failedQueries).not.toAbortOnUnmount();
  });

  it('does not abort completed queries', () => {
    function completedQueries(request) {
      request.block();
      request.resolve();
      request.succeed();
    }
    expect(completedQueries).not.toAbortOnUpdate();
    expect(completedQueries).not.toAbortOnUnmount();
  });
});
