// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import AccountsSettings from '../../../components/settings/categories/AccountsSettings';
import type { InjectedProps } from '../../../types/injectedPropsType';

@observer
export default class AccountsSettingsPage extends Component<InjectedProps> {

  onSelectLanguage = (values: { locale: string }) => {
    this.props.actions.profile.updateLocale.trigger(values);
  };

  render() {
    const { setProfileLocaleRequest, LANGUAGE_OPTIONS, currentLocale } = this.props.stores.profile;
    return (
      <AccountsSettings />
    );
  }

}
