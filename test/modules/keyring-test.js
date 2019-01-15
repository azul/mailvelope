import {expect} from 'test';
import {LocalStorageStub} from 'utils';
import mvelo from 'lib/lib-mvelo';
import {init, createKeyring, deleteKeyring, getAll, getById, getAllKeyringAttr, getKeyringAttr, setKeyringAttr, getKeyData, getKeyByAddress, getKeyringWithPrivKey, getPreferredKeyring, syncPublicKeys, __RewireAPI__ as keyringRewireAPI} from 'modules/keyring';
import KeyStoreLocal from 'modules/KeyStoreLocal';
import testKeys from 'Fixtures/keys';

describe('keyring unit tests', () => {
  let storage;

  beforeEach(async () => {
    const keyringIds = [mvelo.MAIN_KEYRING_ID, 'test123'];
    let keyringAttributes;
    storage = new LocalStorageStub();
    for (const keyringId of keyringIds) {
      let storedTestKeys;
      if (keyringId === mvelo.MAIN_KEYRING_ID) {
        storedTestKeys = {public: [testKeys.maxp_pub], private: [testKeys.maditab_prv]};
        keyringAttributes = {
          default_key: '771f9119b823e06c0de306d466663688a83e9763'
        };
      } else {
        storedTestKeys = {public: [testKeys.gordonf_pub], private: [testKeys.johnd_prv]};
        keyringAttributes = {};
      }
      await storage.importKeys(keyringId, storedTestKeys);
      await storage.importAttributes(keyringId, keyringAttributes);
    }
    KeyStoreLocal.__Rewire__('mvelo', {
      storage
    });
    keyringRewireAPI.__Rewire__('mvelo', {
      MAIN_KEYRING_ID: mvelo.MAIN_KEYRING_ID,
      storage,
      Error,
      util: {
        filterAsync: mvelo.util.filterAsync,
        toArray: mvelo.util.toArray
      }
    });
    await init();
  });

  afterEach(() => {
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('createKeyring', () => {
    it('should create a new keyring and initialize keyring attributes', async () => {
      const newKeyringId = 'testABC';
      const newKeyring = await createKeyring(newKeyringId);
      expect(newKeyring.id).to.equal(newKeyringId);
      const allKeyrings = await getAll();
      expect(allKeyrings.some(({id}) => id === newKeyringId)).to.be.true;
      const allKeyringAttrs = await getAllKeyringAttr();
      expect(Object.keys(allKeyringAttrs).includes(newKeyringId)).to.be.true;
    });
  });

  describe('deleteKeyring', () => {
    it('Should delete keyring, all keys and keyring attributes', async () => {
      expect(getById('test123')).to.not.throw;
      return expect(deleteKeyring('test123')).to.eventually.throw;
    });
  });

  describe('getById', () => {
    it('Should get keyring by Id', () => {
      expect(getById('test123')).to.not.throw;
    });
  });

  describe('getAll', () => {
    it('Should get all keyrings', () => {
      expect(getAll().length).to.equal(2);
    });
  });

  describe('getAllKeyringAttr', () => {
    it('Should get all keyring attributes as an object map', () => {
      const allKeyringAttrs = getAllKeyringAttr();
      expect(allKeyringAttrs[mvelo.MAIN_KEYRING_ID].default_key).to.equal('771f9119b823e06c0de306d466663688a83e9763');
    });
  });

  describe('setKeyringAttr', () => {
    it('Should set keyring attributes', async () => {
      await setKeyringAttr('test123', {
        default_key: '123456789'
      });
      const storedAttrs = await storage.get('mvelo.keyring.attributes');
      expect(storedAttrs['test123'].default_key).to.equal('123456789');
      expect(getKeyringAttr('test123', 'default_key')).to.equal('123456789');
    });
  });

  describe('getKeyData', () => {
    it('Should get user id, key id, fingerprint, email and name for all keys in the preferred keyring queue', async () => {
      const keyData = await getKeyData(mvelo.MAIN_KEYRING_ID);
      expect(keyData.length).to.equal(5);
      expect(keyData.some(({name}) => name === 'Madita Bernstone'));
    });
  });

  describe('getKeyByAddress', () => {
    it('Should query keys in all keyrings by email address', async () => {
      const keysByAddress = await getKeyByAddress('test123', ['gordon.freeman@gmail.com', 'j.doe@gmail.com']);
      for (const address of Object.keys(keysByAddress)) {
        expect(keysByAddress[address]).to.not.equal(false);
      }
    });
  });

  describe('getKeyringWithPrivKey', () => {
    it('Should get keyring that includes at least one private key of the specified key Ids', () => {
      const keyRing = getKeyringWithPrivKey(['0c02c51f4af1a165']);
      expect(keyRing.id).to.equal('test123');
    });
  });

  describe('getPreferredKeyring', () => {
    it('Should get preferred keyring', () => {
      const keyRing = getPreferredKeyring();
      expect(keyRing.id).to.equal('test123');
    });
  });

  describe('syncPublicKeys', () => {
    it('Should synchronize public keys across keyrings', async () => {
      await syncPublicKeys({keyringId: 'test123', keyIds: ['a9b65c80d7b21a26']});
      const destKeyring = getById('test123');
      const targetKey = await destKeyring.getKeyByAddress('max@mailvelope.com');
      expect(targetKey['max@mailvelope.com']).to.not.be.false;
    });
  });
});
