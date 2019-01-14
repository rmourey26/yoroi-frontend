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
  @observable saveAllMemosRequest: Request<any> = new Request(this.api.localStorage.saveAllMemosToStorage);
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

  @computed get dropboxToken(): string {
    const { result } = this.getUserDropboxTokenRequest.execute();
    return result;
  }

  _checkDropboxFolder = async (): Promise<{ db: any, folderExists: boolean }> => {
    try {
      const accessToken = await this.getUserDropboxTokenRequest.execute();
      const db = new Dropbox({ accessToken });
      const data = await db.filesListFolder({ path: '', fetch: axios });
      const { entries = [] } = data;
      const folder = find(entries, x => x.name === 'YoroiMemos');
      const folderExists = folder !== undefined;
      return { db, folderExists };
    } catch (err) {
      console.log('sync err', err);
    }
  }

  _readBlob = (blob: any): Promise<any> => {
    const reader = new FileReader();
    return new Promise((resolve, reject): string => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        reader.abort();
        reject();
      };
      reader.readAsText(blob);
    });
  }

  _syncMemos = async () => {
    try {
      const { db, folderExists } = await this._checkDropboxFolder();
      if (folderExists) {
        const { entries = [] } = await db.filesListFolder({ path: '/YoroiMemos', fetch: axios });

        const memos = await Promise.all(
          entries.map(async (x) => {
            const { name, path_display: path } = x;
            const { fileBlob } = await db.filesDownload({ path });
            const memoText = await this._readBlob(fileBlob);
            const memoId = name.slice(0, name.length - 4);
            return { memoText, memoId };
          })
        );
        await this.saveAllMemosRequest.execute(memos);
        return memos;
      }
    } catch (err) {
      console.log('sync err', err);
    }
  }

  _updateDropboxToken = async (token: string) => {
    await this.setUserDropboxTokenRequest.execute(token);
    await this.getUserDropboxTokenRequest.execute(); // eagerly cache
    await this._syncMemos();
  };

  _getToken = () => {
    this.getUserDropboxTokenRequest.execute();
  }

  _saveMemoToLocal = async (memo) => {
    await this.saveMemoToLocalRequest.execute(memo);
  }

  _getMemosFromLocal = () => {
    this.getMemosFromLocalRequest.execute();
  }

  _saveMemo = async ({ memoId = '', memoText = '' }: { memoId: string, memoText: string }): Promise<any> => {
    try {
      const { db, folderExists } = await this._checkDropboxFolder();
      if (!folderExists) await db.filesCreateFolderV2({ path: '/YoroiMemos' });
      const saved = await db.filesUpload({ path: `/YoroiMemos/${memoId}.txt`, contents: memoText });
      console.log('save memo result!', saved);
    } catch (err) {
      console.log('err', err);
    }
  }
}
