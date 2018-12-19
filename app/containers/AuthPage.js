// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { defineMessages } from 'react-intl';
import LoadingSpinner from '../components/widgets/LoadingSpinner';
import CenteredLayout from '../components/layout/CenteredLayout';
import Loading from '../components/loading/Loading';
import adaLogo from '../assets/images/ada-logo.inline.svg';
import cardanoLogo from '../assets/images/cardano-logo.inline.svg';
import type { InjectedProps } from '../types/injectedPropsType';

export const messages = defineMessages({
  loading: {
    id: 'loading.screen.loading',
    defaultMessage: '!!!loading components',
    description: 'Message "loading components" on the loading screen.'
  },
});

@observer
export default class AuthPage extends Component<InjectedProps> {
  componentDidMount() {
    console.log('props', this.props);
  }

  render() {
    const { stores } = this.props;
    const { loading } = stores;
    return (
      <CenteredLayout>
        <LoadingSpinner />
      </CenteredLayout>
    );
  }
}
