/**
 * @typedef {object} Player
 * @property {int} id
 * @property {int} site_id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} name_key
 * @property {string} created_at
 * @property {string} updated_at
 */
/**
 * @typedef {object} PlayerSeason
 * @property {int} id
 * @property {int} site_id
 * @property {int} site_id
 * @property {int} player_id
 * @property {int} season_id
 * @property {string} title
 * @property {'JV'|'V'|'STAFF'} team
 * @property {'FIELD'|'GOALIE'} position
 * @property {string} number
 * @property {string} shutterfly_tag
 * @property {int} sort
 * @property {string} created_at
 * @property {string} updated_at
 * @property {Player} player
 */

/**
 * @typedef {object} RosterData
 * @property {string} firstName
 * @property {string} lastName
 * @property {object} parent1
 * @property {object} parent2
 * @property {?string} tagId
 * @property {?int} tagCount
 * @property {int} storageId
 * @property {int} localId
 * @property {int} created
 */

/**
 * @typedef {object} PlayerFormData
 * @property {int} playerSeasonId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} tagId
 * @property {boolean} save
 */