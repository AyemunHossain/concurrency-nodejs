'use strict';

const sanitizeGeneralUserObj = (user) => {
  return {
    ...user, 
    salt: null, 
    hash: null
  };
};

export default {
  sanitizeGeneralUserObj
};