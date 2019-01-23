// @flow
import { observable, computed } from 'mobx';
import { Dropbox } from 'dropbox';
import axios from 'axios';
import { find, map, keys } from 'lodash';
import sha1 from 'sha1';
import Store from '../base/Store';
import Request from '../lib/LocalizedRequest';
import { getSingleCryptoAccount } from '../../api/ada/adaLocalStorage';
import { encryptWithPassword, decryptWithPassword } from '../../utils/passwordCipher';

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
    const key = getSingleCryptoAccount().root_cached_key;
    return result ? result[key] : [];
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

  _readFile = async (x: any, db: any): any => {
    const { path_display: path } = x;
    const { fileBlob } = await db.filesDownload({ path });
    const content = await this._readBlob(fileBlob);
    return JSON.parse(content);
  }

  _getFileBytes = data => new Uint8Array(Buffer.from(data, 'utf-8'));

  _getStringFromBytes = bytes => {
    const decoder = new TextDecoder('UTF-8');
    return decoder.decode(bytes);
  }

  _uploadFile = async (db: any, content: any, key: string, update: any) => {

    return await db.filesUpload({
      path: `/YoroiMemos/${key}.json`,
      contents: this._getFileBytes(JSON.stringify(content)),
      //...update && { mode: { '.tag': 'update', update: 'a1c10ce0dd78' } },
      ...update && { mode: 'overwrite' },
    });
  }

  /* needs to be updated due to latest changes */
  _syncMemos = async () => {
    try {
      const secretKey = getSingleCryptoAccount().root_cached_key;
      const hash = sha1(secretKey);

      const { db, folderExists } = await this._checkDropboxFolder();
      if (folderExists) {
        const { entries = [] } = await db.filesListFolder({ path: '/YoroiMemos', fetch: axios });
        const file = find(entries, x => x.name === `${hash}.json`);
        if (file) {
          const content = await this._readFile(file, db);
          const memos = map(keys(content), key => {
            const item = this._getStringFromBytes(decryptWithPassword(secretKey, content[key]));
            return { memoId: key, memoText: item };
          });
          console.log('secret!', secretKey);
          await this.saveAllMemosRequest.execute(memos, secretKey);
          return memos;
        }
      }
    } catch (err) {
      console.log('sync err', err);
    }
  }

  _createMemoContent = async (text: string, id: string, key: string, password: string, db: any, file: any) => {
    const encrypted = encryptWithPassword(password, this._getFileBytes(text));
    if (!file) {
      const data = {
        [id]: encrypted,
      };
      return await this._uploadFile(db, data, key, false);
    }
    const content = await this._readFile(file, db);
    content[id] = encrypted;
    return await this._uploadFile(db, content, key, true);
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
    const secretKey = getSingleCryptoAccount().root_cached_key;
    await this.saveMemoToLocalRequest.execute(memo, secretKey);
  }

  _getMemosFromLocal = () => {
    this.getMemosFromLocalRequest.execute();
  }

  _saveMemo = async ({ memoId = '', memoText = '' }: { memoId: string, memoText: string }): Promise<any> => {
    try {
      const secretKey = getSingleCryptoAccount().root_cached_key;
      const hash = sha1(secretKey);

      const { db, folderExists } = await this._checkDropboxFolder();
      if (!folderExists) await db.filesCreateFolderV2({ path: '/YoroiMemos' });

      const { entries = [] } = await db.filesListFolder({ path: '/YoroiMemos', fetch: axios });
      const current = find(entries, x => x.name === `${hash}.json`);
      const foo = await this._createMemoContent(memoText, memoId, hash, secretKey, db, current);
      console.log('foo', foo);
    } catch (err) {
      console.log('err', err);
    }
  }
}
