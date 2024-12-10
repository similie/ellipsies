import { EllipsiesController, EllipsiesExtends } from "../../index";
import { PassportModel } from "../test-models";

@EllipsiesExtends("passports")
export class PassportController extends EllipsiesController<PassportModel> {
  public constructor() {
    super(PassportModel);
  }
}
