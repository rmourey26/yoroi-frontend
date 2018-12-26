// @flow
import { observable, computed } from 'mobx';
import Store from '../base/Store';

export default class AccountsStore extends Store {

  /* eslint-disable max-len */
  @observable getUserDropboxTokenRequest: Request<string> = new Request(this.api.localStorage.getUserDropboxToken);
  @observable setUserDropboxTokenRequest: Request<string> = new Request(this.api.localStorage.setUserDropboxToken);
  /* eslint-enable max-len */

  setup() {
    this.actions.accountsActions.updateDropboxToken.listen(this._updateDropboxToken);
  }

  _updateDropboxToken = async (token: string) => {
    await this.setUserDropboxTokenRequest.execute(token);
    await this.getUserDropboxTokenRequest.execute(); // eagerly cache
  };

  @computed get dropboxToken(): string {
    return 'test';
  }
}
