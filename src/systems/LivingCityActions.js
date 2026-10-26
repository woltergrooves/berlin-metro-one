import {attachCityEvents} from './CityEvents.js';
import {attachCityPhone} from './CityPhone.js';
import {save} from './ConversationModelV1.js';
const getGame=()=>globalThis.__berlinMetroGame;
const city=attachCityEvents({document,getGame,persist:save});
attachCityPhone({document,getGame,sync:city.sync});
