// @flow
import { observable, computed } from 'mobx';
import { Dropbox } from 'dropbox';
import axios from 'axios';
import { find, map, keys, reduce } from 'lodash';
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
    const { rev, fileBlob } = await db.filesDownload({ path });
    const content = await this._readBlob(fileBlob);
    return { rev, content: JSON.parse(content) };
  }

  _getFileBytes = data => new Uint8Array(Buffer.from(data, 'utf-8'));

  _getStringFromBytes = bytes => {
    const decoder = new TextDecoder('UTF-8');
    return decoder.decode(bytes);
  }


  _uploadFile = async (
    db: any,
    content: any,
    path: string,
    rev: string,
  ) => {
    return await db.filesUpload({
      path,
      contents: this._getFileBytes(JSON.stringify(content)),
      ...!!rev && { mode: { '.tag': 'update', update: rev }, autorename: true },
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
      return await this._uploadFile(db, { rev: '', toUpload: data }, key, false);
    }
    const { rev, content } = await this._readFile(file, db);
    const toUpload = { ...content, [id]: encrypted };
    content[id] = encrypted;
    const data = { rev, toUpload };
    return await this._uploadFile(db, data, key, true);
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

  /*_saveMemo = async ({ memoId = '', memoText = '' }: { memoId: string, memoText: string }): Promise<any> => {
    try {
      /*const secretKey = getSingleCryptoAccount().root_cached_key;
      const hash = sha1(secretKey);

      const { db, folderExists } = await this._checkDropboxFolder();
      if (!folderExists) await db.filesCreateFolderV2({ path: '/YoroiMemos' });

      const { entries = [] } = await db.filesListFolder({ path: '/YoroiMemos', fetch: axios });
      const current = find(entries, x => x.name === `${hash}.json`);
      const foo = await this._createMemoContent(memoText, memoId, hash, secretKey, db, current);
      console.log('foo', foo);
      const secretKey = getSingleCryptoAccount().root_cached_key;
      const hash = sha1(secretKey);

      const { db, folderExists } = await this._checkDropboxFolder();
      if (!folderExists) await db.filesCreateFolderV2({ path: '/YoroiMemos' });

      const { entries = [] } = await db.filesListFolder({ path: '/YoroiMemos', fetch: axios });
      const current = find(entries, x => x.name === `${hash}.json`);

      const uploaded = await this._createMemoContent(memoText, memoId, hash, secretKey, db, current);
      console.log('uploaded', uploaded);

      const { name, path_display: path } = uploaded;
      if (name.includes('conflict')) {
        // read the origin file
        // merge the content of both files
        // upload again the merged content to the origin file
        // delete the conflicted copy
      }
      /*const filePath = '/first.json';
      const { rev, fileBlob } = await db.filesDownload({ path: filePath });
      const content = await this._readBlob(fileBlob);
      const parsed = JSON.parse(content);
      parsed.bKey = 'b';
      const uploaded = await db.filesUpload({ path: filePath, contents: JSON.stringify(parsed), mode: { '.tag': 'update', update: rev }, autorename: true });
      console.log('up', uploaded);
      const second = { ...parsed, cKey: 'c' };
      const secondUp = await db.filesUpload({ path: filePath, contents: JSON.stringify(second), mode: { '.tag': 'update', update: rev }, autorename: true });
      console.log('second up', secondUp);
    } catch (err) {
      console.log('err', err);
    }
  }
}*/

/*
1. Check a folder and create one, if necessary
2. try to find a file
3. read a file, if it exists
4. create content
5. upload
6. check if conflict
7. if it is, resolve
 */

  _checkRev = (rev: string, localRev: string) => rev === localRev;

  _getFileData = async (db: any, hash: any, localRev: string) => {
    try {
      const { entries = [] } = await db.filesListFolder({ path: '/YoroiMemos', fetch: axios });
      const current = find(entries, x => x.name === `${hash}.json`);

      if (!current) return { rev: undefined, data: {} };

      const { rev } = current;
      const isRevValid = this._checkRev(rev, localRev);

      if (isRevValid) {
        return { rev: undefined, data: {} };
      }

      const path = `/YoroiMemos/${hash}.json`;
      const { rev: newRev, fileBlob } = await db.filesDownload({ path });
      const content = await this._readBlob(fileBlob);
      return { rev: newRev, data: JSON.parse(content) };

    } catch (err) {
      return err;
    }
  }

  _getKeys = () => {
    const key = getSingleCryptoAccount().root_cached_key;
    const hash = sha1(key);
    return { key, hash };
  }


  _saveMemo = async ({ memoId = '', memoText = '' }: { memoId: string, memoText: string }): Promise<any> => {
    try {
      const { key, hash } = this._getKeys();
      const path = `/YoroiMemos/${hash}.json`;
      const localRev = '';
      const memo = {
        [memoId]: encryptWithPassword(key, this._getFileBytes(memoText)),
      };
      const { db, folderExists } = await this._checkDropboxFolder();

      if (!folderExists) await db.filesCreateFolderV2({ path: '/YoroiMemos' });

      const { rev, data } = await this._getFileData(db, hash, localRev);

      const toUpload = { ...data, ...memo };

      const foo = await this._uploadFile(db, toUpload, path, rev);
      console.log('foo', foo);
    } catch (err) {
      console.log('err', err);
    }
  }

}
