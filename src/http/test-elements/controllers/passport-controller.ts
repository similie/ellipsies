import { EllipsiesModelController, EllipsiesExtends } from "../../index";
import { PassportModel } from "../test-models";

@EllipsiesExtends("passports")
export class PassportController extends EllipsiesModelController<PassportModel> {
  public constructor() {
    super(PassportModel);
  }
}
