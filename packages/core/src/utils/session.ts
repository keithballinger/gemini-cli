/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { platform } from '../platform.js';

export const sessionId = platform.crypto.randomUUID();
