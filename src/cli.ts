#!/usr/bin/env node

import { createCliProgram } from "./create-cli-program.js";

createCliProgram().parse(process.argv);
