import {PlayerController} from '../core/PlayerController.js';
import {CONFIG} from '../config.js';
import {installStairSeamGuard} from './StairSeamGuard.js';
installStairSeamGuard(PlayerController,CONFIG);
