import { Note } from '../../classes';

/**
 * Returns an array of unencrypted notes for testing.
 *
 * The reason for having this function instead of static data is because
 * static data will be mutated by tests which then causes other tests to
 * fail or rely on polluted data.
 */
export function getDummyNotes(): Note[] {
  return [
    {
      uuid: '2cbe0086-4b6f-466f-9ec0-9a302480da6a',
      timestamp: 958201892455,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: '2e36d871-0de2-43e6-9cbc-3c77e5d154cb',
      timestamp: 811831863971,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: 'b8ff4ac5-6541-49d2-9c79-4444d872481e',
      timestamp: 739056902017,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: '6b24cde1-6118-4277-9791-8eab3c71cabb',
      timestamp: 157836992432,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: 'ac4e006d-38d4-4373-af31-4a5f46fc5184',
      timestamp: 1066734006578,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: '6fb3ce26-82e0-408f-84bf-bd8cd64c35b2',
      timestamp: 1642640862249,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: '81648517-86ff-4ed9-8bf7-941c32dd0fad',
      timestamp: 242282290063,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: '9a2f52b3-69ac-4158-a9f7-b79ba9dbafd3',
      timestamp: 550235579146,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: 'b9754a63-843c-4f59-9aea-9a374aa1603d',
      timestamp: 1533441892487,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Amet consectetur adipisicing\\n\\namet consectetur adipisicing\\namet consectetur adipisicing\\namet consectetur adipisicing\\n',
            },
          ],
        },
        title: 'Amet consectetur adipisicing',
        body: 'amet consectetur adipisicing',
      },
    },
    {
      uuid: '7a7bccda-3fac-4465-b9c9-8f67dc1b5bdf',
      timestamp: 1650008403223,
      content: {
        delta: {
          ops: [
            {
              insert:
                'Note with special characters\n\n😬ö\n  sss\n\t\nKetchup\nSalt \nSugar\n\n¯\\_(ツ)_/¯\n\n──────────────────────────────────\n──────▄▀▀▄────────────────▄▀▀▄────\n─────▐▒▒▒▒▌──────────────▌▒▒▒▒▌───\n─────▌▒▒▒▒▐─────────────▐▒▒▒▒▒▐───\n────▐▒▒▒▒▒▒▌─▄▄▄▀▀▀▀▄▄▄─▌▒▒▒▒▒▒▌──\n───▄▌▒▒▒▒▒▒▒▀▒▒▒▒▒▒▒▒▒▒▀▒▒▒▒▒▒▐───\n─▄▀▒▐▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▌───\n▐▒▒▒▌▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▐───\n▌▒▒▌▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▌──\n▒▒▐▒▒▒▒▒▒▒▒▒▄▀▀▀▀▄▒▒▒▒▒▄▀▀▀▀▄▒▒▐──\n▒▒▌▒▒▒▒▒▒▒▒▐▌─▄▄─▐▌▒▒▒▐▌─▄▄─▐▌▒▒▌─\n▒▐▒▒▒▒▒▒▒▒▒▐▌▐█▄▌▐▌▒▒▒▐▌▐█▄▌▐▌▒▒▐─\n▒▌▒▒▒▒▒▒▒▒▒▐▌─▀▀─▐▌▒▒▒▐▌─▀▀─▐▌▒▒▒▌\n▒▌▒▒▒▒▒▒▒▒▒▒▀▄▄▄▄▀▒▒▒▒▒▀▄▄▄▄▀▒▒▒▒▐\n▒▌▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▄▄▄▒▒▒▒▒▒▒▒▒▒▒▐\n▒▌▒▒▒▒▒▒▒▒▒▒▒▒▀▒▀▒▒▒▀▒▒▒▀▒▀▒▒▒▒▒▒▐\n▒▌▒▒▒▒▒▒▒▒▒▒▒▒▒▀▒▒▒▄▀▄▒▒▒▀▒▒▒▒▒▒▒▐\n▒▐▒▒▒▒▒▒▒▒▒▒▀▄▒▒▒▄▀▒▒▒▀▄▒▒▒▄▀▒▒▒▒▐\n▒▓▌▒▒▒▒▒▒▒▒▒▒▒▀▀▀▒▒▒▒▒▒▒▀▀▀▒▒▒▒▒▒▐\n▒▓▓▌▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▌\n▒▒▓▐▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▌─\n▒▒▓▓▀▀▄▄▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▐──\n▒▒▒▓▓▓▓▓▀▀▄▄▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▄▄▀▀▒▌─\n▒▒▒▒▒▓▓▓▓▓▓▓▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▒▒▒▒▒▐─\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▌\n▒▒▒▒▒▒▒█▒█▒█▀▒█▀█▒█▒▒▒█▒█▒█▒▒▒▒▒▒▐\n▒▒▒▒▒▒▒█▀█▒█▀▒█▄█▒▀█▒█▀▒▀▀█▒▒▒▒▒▒▐\n▒▒▒▒▒▒▒▀▒▀▒▀▀▒▀▒▀▒▒▒▀▒▒▒▀▀▀▒▒▒▒▒▒▐\n█▀▄▒█▀▄▒█▀▒█▀█▒▀█▀▒█▒█▒█▒█▄▒█▒▄▀▀▐\n█▀▄▒█▀▄▒█▀▒█▄█▒▒█▒▒█▀█▒█▒█▀██▒█▒█▐\n▀▀▒▒▀▒▀▒▀▀▒▀▒▀▒▒▀▒▒▀▒▀▒▀▒▀▒▒▀▒▒▀▀▐\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▐\n\n',
            },
          ],
        },
        title: 'Note with special characters',
        body: '😬ö',
      },
    },
  ].map((nt) => new Note(nt));
}
