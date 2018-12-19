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
export default class GeneralSettings extends Component {
  static contextTypes = {
    intl: intlShape.isRequired,
  };

  render() {
    const componentClassName = classNames([styles.component, 'general']);
    return (
      <div className={componentClassName}>
        <div className={styles.title}>Dropbox</div>
        <Link to="/auth/dropbox">Authorize Yoroi in Dropbox</Link>
      </div>
    );
  }

}
