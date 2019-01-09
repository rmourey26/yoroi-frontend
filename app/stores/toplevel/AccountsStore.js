// @flow
import { observable, computed } from 'mobx';
import { Dropbox } from 'dropbox';
import axios from 'axios';
import { find } from 'lodash';
import Store from '../base/Store';
import Request from '../lib/LocalizedRequest';

export default class AccountsStore extends Store {

  /* eslint-disable max-len */
  @observable getUserDropboxTokenRequest: Request<string> = new Request(this.api.localStorage.getUserDropboxToken);
  @observable setUserDropboxTokenRequest: Request<string> = new Request(this.api.localStorage.setUserDropboxToken);
  @observable getMemosFromLocalRequest: Request<string> = new Request(this.api.localStorage.getMemosFromStorage);
  @observable saveMemoToLocalRequest: Request<string> = new Request(this.api.localStorage.saveMemoToStorage);
  /* eslint-enable max-len */

  setup() {
    this.actions.accountsActions.updateDropboxToken.listen(this._updateDropboxToken);
    this.actions.accountsActions.saveMemo.listen(this._saveMemo);
    this.actions.accountsActions.saveMemoToLocal.listen(this._saveMemoToLocal);
    this._getToken();
    this._getMemosFromLocal();
  }

  @computed get localMemos() {
    const { result } =  this.getMemosFromLocalRequest.execute();
    return result;
  }

  _updateDropboxToken = async (token: string) => {
    await this.setUserDropboxTokenRequest.execute(token);
    await this.getUserDropboxTokenRequest.execute(); // eagerly cache
  };

  @computed get dropboxToken(): string {
    const { result } = this.getUserDropboxTokenRequest.execute();
    return result;
  }

  _getToken = () => {
    this.getUserDropboxTokenRequest.execute();
  }

  _saveMemoToLocal = async (memo, id) => {
    await this.saveMemoToLocalRequest.execute(memo, id);
  }

  _getMemosFromLocal = () => {
    this.getMemosFromLocalRequest.execute();
  }

  _saveMemo = async (memo = 'hey', id = '') => {
    try {
      const accessToken = await this.getUserDropboxTokenRequest.execute();
      const db = new Dropbox({ accessToken });
      const data = await db.filesListFolder({ path: '', fetch: axios });
      const { entries = [] } = data;
      const folder = find(entries, x => x.name === 'YoroiMemos') || await db.filesCreateFolderV2({ path: '/YoroiMemos' });
      const memos = await db.filesListFolder({ path: '/YoroiMemos' });
      const num = id || memos.entries.length + 1;
      console.log('amount', memos);
      const saved = await db.filesUpload({ path: `/YoroiMemos/${num + 1}.txt`, contents: memo });
      console.log('save memo result!', saved, num);
      return num;
    } catch (err) {
      console.log('err', err);
    }
  }
}
