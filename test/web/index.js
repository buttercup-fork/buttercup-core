import { expect } from "chai";
import sinon from "sinon";
import { init } from "../../source/index.web.js";
import { getSharedAppEnv } from "../../source/env/appEnv.js";

init();

Object.assign(window, {
    expect,
    sinon
});

getSharedAppEnv().getProperty("crypto/v1/setDerivationRounds")(10);
