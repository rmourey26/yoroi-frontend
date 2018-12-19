// @flow
import { computed } from 'mobx';
import Store from '../base/Store';
import { buildRoute } from '../../utils/routing';

export default class AccountsStore extends Store {

  setup() {
    
  }

  @computed get dropboxToken(): string {
    return 'test';
  }
}
