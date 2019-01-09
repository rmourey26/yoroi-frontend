import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { defineMessages, intlShape } from 'react-intl';

import Dialog from '../../widgets/Dialog';
import DialogCloseButton from '../../widgets/DialogCloseButton';

const messages = defineMessages({
  remove: {
    id: 'wallet.send.memo.remove',
    defaultMessage: '!!!Remove memo?',
    description: 'Remove memo',
  },
});

@observer
export default class WalletCloseMemoDialog extends Component {
  render() {
    const { close, submit, format } = this.props;
    const actions = [
      {
        label: 'No',
        onClick: close,
        primary: true,
      },
      {
        label: 'Yes',
        onClick: submit,
        primary: true,
      }
    ];
    return (
      <Dialog
        title="Confirm memo removal"
        closeButton={<DialogCloseButton />}
        actions={actions}
      >
        <div>{format(messages.remove)}</div>
      </Dialog>
    );
  }
}
