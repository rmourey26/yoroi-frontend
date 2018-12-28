// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import classNames from 'classnames';
import { defineMessages, intlShape } from 'react-intl';
import { Link } from 'react-router';
import styles from './AccountsSettings.scss';

const messages = defineMessages({
  languageSelectLabel: {
    id: 'settings.general.languageSelect.label',
    defaultMessage: '!!!Language',
    description: 'Label for the language select.'
  },
});


@observer
export default class AccountsSettings extends Component {
  static contextTypes = {
    intl: intlShape.isRequired,
  };

  handleClick = () => {
    this.props.saveMemo('dfdfdsfsd');
  }

  render() {
    const { token } = this.props;
    const componentClassName = classNames([styles.component, 'general']);
    return (
      <div className={componentClassName}>
        <div className={styles.title}>Dropbox</div>
        {!token ? (
          <a
            href="https://www.dropbox.com/oauth2/authorize?client_id=9elutclicnuxx4o&&response_type=token&redirect_uri=chrome-extension://bflmcienanhdibafopagdcaaenkmoago/main_window.html"
          >
            Authorize Yoroi in Dropbox
          </a>
        ) : <div>Dropbox account linked</div>}
        <div onClick={this.handleClick}>TEST</div>
      </div>
    );
  }

}
