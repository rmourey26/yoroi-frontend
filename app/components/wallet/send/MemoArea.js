import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router';
import { defineMessages, intlShape } from 'react-intl';
import TextArea from 'react-polymorph/lib/components/TextArea';
import TextAreaSkin from 'react-polymorph/lib/skins/simple/raw/TextAreaSkin';

import WalletCloseMemoDialog from './WalletCloseMemoDialog';
import styles from './WalletSendForm.scss';

export const messages = defineMessages({
  memoButton: {
    id: 'wallet.send.memo.button',
    defaultMessage: '!!!Add memo',
    description: 'Memo button text',
  },
  memoLabel: {
    id: 'wallet.send.memo.label',
    defaultMessage: '!!!Memo',
    description: 'Label for memo textarea',
  },
  memoPlaceholder: {
    id: 'wallet.send.memo.placeholder',
    defaultMessage: '!!!Add memo to your transaction',
    description: 'Placeholder for memo textarea',
  },
  memoDropboxIsMissing: {
    id: 'wallet.send.memo.dropboxIsMissing',
    defaultMessage: '!!!In order to attach private memos to transactions you need to link Dropbox account.',
    description: 'Info text to let user know about missing dropbox token',
  },
  memoLinkDropbox: {
    id: 'wallet.send.memo.link',
    defaultMessage: '!!!Link Dropbox',
    description: 'Link to account settings text',
  }
});

@observer
export default class MemoArea extends Component {
  state = {
    isMemoOpen: false,
    isMemoRemoveConfirmationOpen: false,
  };

  handleToggleMemo = () => {
    const { isMemoOpen } = this.state;
    const { form } = this.props;
    const memoField = form.$('memo');
    if (memoField.value.trim() && isMemoOpen) {
      this.handleRemoveMemoDialog();
    } else this.setState({ isMemoOpen: !isMemoOpen });
  }

  handleRemoveMemoDialog = () => {
    const { isMemoRemoveConfirmationOpen } = this.state;
    this.setState({ isMemoRemoveConfirmationOpen: !isMemoRemoveConfirmationOpen });
  }

  handleRemoveMemoSubmit = () => {
    const { form } = this.props;
    form.$('memo').reset();
    this.setState({ isMemoRemoveConfirmationOpen: false, isMemoOpen: false });
  }

  render() {
    const { dropboxToken, intl, form } = this.props;
    const { isMemoOpen, isMemoRemoveConfirmationOpen } = this.state;
    const memoField = form.$('memo');
    return (
      <div>
        <div className={styles.addMemoArea}>
          <button className={`${styles.addMemoButton}${isMemoOpen ? ' ' + styles.open : ''}`} onClick={this.handleToggleMemo} type="button">
            {intl.formatMessage(messages.memoButton)}
          </button>
          {isMemoOpen && (
            dropboxToken ? (
              <TextArea
                {...memoField.bind()}
                skin={<TextAreaSkin />}
              />
            ) : (
              <div className={styles.linkInfo}>
                <div>{intl.formatMessage(messages.memoDropboxIsMissing)}</div>
                <Link to="/settings/accounts" className={styles.link}>{intl.formatMessage(messages.memoLinkDropbox)}</Link>
              </div>
            )
          )}
        </div>
        {isMemoRemoveConfirmationOpen && (
          <WalletCloseMemoDialog
            close={this.handleRemoveMemoDialog}
            submit={this.handleRemoveMemoSubmit}
            format={intl.formatMessage}
          />
        )}
      </div>
    );
  }
}
