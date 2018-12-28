// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import LoadingSpinner from '../components/widgets/LoadingSpinner';
import CenteredLayout from '../components/layout/CenteredLayout';
import type { InjectedProps } from '../types/injectedPropsType';

import { ROUTES } from '../routes-config';

@observer
export default class AuthPage extends Component<InjectedProps> {
  componentDidMount() {
    const { stores, actions } = this.props;
    const { currentRoute } = stores.app;
    const { dropboxToken } = stores.accounts;
    const { updateDropboxToken } = actions.accountsActions;
    if (!dropboxToken) {
      const token = currentRoute.slice(14, 78);
      updateDropboxToken.trigger(token);
    }
    actions.router.goToRoute.trigger({ route: ROUTES.SETTINGS.ACCOUNTS });
  }

  render() {
    return (
      <CenteredLayout>
        <LoadingSpinner />
      </CenteredLayout>
    );
  }
}
