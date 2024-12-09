import {
  Model,
  LiveConnectionConstruct,
} from '@similie/model-connect-entities';
import { IPassport, IUser } from './models';

export * from './models';
export class Passport extends Model<IPassport> {
  public constructor(connector?: LiveConnectionConstruct) {
    super(connector);
    this.modelname = 'passports';
  }
}
export class User extends Model<IUser> {
  public constructor(connector?: LiveConnectionConstruct) {
    super(connector);
    this.modelname = 'users';
  }
}
