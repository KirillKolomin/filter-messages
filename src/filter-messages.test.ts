import {filterMessages} from './filter-messages';
import {Message} from './domain';

const boolTrue = {
    boolean: true,
};

const boolFalse = {
    boolean: false,
};

const stringEqual = {
    string: 'string',
};

const stringStartsWith = {
    string: '$StartsWith',
};

const stringEndsWith = {
    string: 'EndsWith$',
};

const stringContains = {
    string: 'string contains $$ double dollar symbol',
};

const numberEqual = {
    number: 12
};

const dateMessage = {date: new Date().toISOString()}

const complexMessage = {
    field1: 122,
    field2: new Date('2030-01-01T12:00:00.000Z').toISOString(),
}

const complexMessage2 = {
    field1: 123,
    field2: new Date('2030-01-01T12:00:00.000Z').toISOString(),
}

const complexMessage3 = {
    field1: 124,
    field2: new Date('2030-01-01T12:00:00.000Z').toISOString(),
}

const complexMessage4 = {
    field1: 'string',
    field2: new Date('2030-01-01T12:00:00.000Z').toISOString(),
}

const messageWithNestedObjects: Message = {
    nestedObject: {
        nestedField1: {
            number: 1,
            string: '1'
        }
    }
}

const messages: Message[] = [
    boolTrue,
    boolFalse,
    stringEqual,
    stringStartsWith,
    stringEndsWith,
    stringContains,
    numberEqual,
    dateMessage,
    complexMessage,
    complexMessage2,
    complexMessage3,
    messageWithNestedObjects,
];

describe('filterMessages', () => {
    it('works on Boolean filter', () => {
        expect(
            filterMessages(messages, {field: 'boolean', type: 'boolean', operation: 'eq', value: true}),
        ).toEqual([boolTrue]);

        expect(
            filterMessages(messages, {field: 'boolean', type: 'boolean', operation: 'eq', value: false}),
        ).toEqual([boolFalse]);
    });

    it('String filter', () => {
        expect(
            filterMessages(messages, {field: 'string', type: 'string', operation: 'eq', value: 'string'}),
        ).toEqual([stringEqual]);

        expect(
            filterMessages(messages, {field: 'string', type: 'string', operation: 'startsWith', value: '$Star'}),
        ).toEqual([stringStartsWith]);

        expect(
            filterMessages(messages, {field: 'string', type: 'string', operation: 'endsWith', value: 'th$'}),
        ).toEqual([stringEndsWith]);

        expect(
            filterMessages(messages, {field: 'string', type: 'string', operation: 'contains', value: '$$'}),
        ).toEqual([stringContains]);
    });

    it('Number filter', () => {
        expect(
            filterMessages(messages, {field: 'number', type: 'number', operation: 'eq', value: 12}),
        ).toEqual([numberEqual]);
    });

    it('Date filter', () => {
        expect(
            filterMessages(messages, {field: 'date', type: 'date', operation: 'eq', value: dateMessage.date}),
        ).toEqual([dateMessage]);
    });

    it('works on OR filter', () => {
        expect(
            filterMessages(messages, {
                type: 'or',
                filters: [
                    {field: 'string', type: 'string', operation: 'startsWith', value: '$'},
                    {field: 'string', type: 'string', operation: 'endsWith', value: '$'},
                ],
            }),
        ).toEqual([stringStartsWith, stringEndsWith]);
    });

    it('works on AND filter', () => {
        expect(
            filterMessages(messages, {
                type: 'and',
                filters: [
                    {field: 'string', type: 'string', operation: 'startsWith', value: '$'},
                    {field: 'string', type: 'string', operation: 'contains', value: 'With'},
                ],
            }),
        ).toEqual([stringStartsWith]);
    });

    it('works on complex filter', () => {
        expect(
            filterMessages(messages, {
                type: 'and',
                filters: [
                    {
                        type: 'or',
                        filters: [
                            {field: 'field1', type: 'number', operation: 'lt', value: 123},
                            {field: 'field1', type: 'number', operation: 'gt', value: 123},
                        ],
                    },
                    {field: 'field2', type: 'date', operation: 'after', value: new Date()},
                ],
            }),
        ).toEqual([complexMessage, complexMessage3]);
    });

    it('works on nested objects', () => {
        expect(
            filterMessages(messages, {
                type: 'and',
                filters: [
                    {
                        type: 'number',
                        field: 'nestedObject.nestedField1.number',
                        value: 1,
                        operation: 'eq'
                    },
                    {
                        type: 'string',
                        field: 'nestedObject.nestedField1.string',
                        value: '1',
                        operation: 'eq'
                    }
                ]
            })
        ).toEqual([messageWithNestedObjects])
    })
});
