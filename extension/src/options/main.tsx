import React from "react";
import { createRoot } from "react-dom/client";
import { Options } from "./Options";
import "@/index.css";

const container = document.getElementById("options-root")!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
