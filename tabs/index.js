import React from "react";
import ReactDOM from "react-dom";
import {BaseProvider, DarkTheme} from "baseui";
import {Provider as StyletronProvider} from "styletron-react";
import {Client as Styletron} from "styletron-engine-atomic";

import App from "./App";

const engine = new Styletron();

ReactDOM.render(
  <StyletronProvider value={engine}>
    <BaseProvider theme={DarkTheme}>
      <App />
    </BaseProvider>
  </StyletronProvider>,
  document.getElementById("root")
);
