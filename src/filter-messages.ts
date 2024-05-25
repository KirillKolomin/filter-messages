import {AndFilter, BooleanFilter, DateFilter, Filter, Message, NumberFilter, OrFilter, StringFilter} from "./domain";

type FilterCb = (message: Message, filter: Filter) => boolean;
type Primitive = 'string' | 'number' | 'boolean';

const checkOnType = (cb: FilterCb, type: Primitive): FilterCb => {
    return (message: Message, filter: StringFilter) => {
        if (typeof message[filter.field] !== type) {
            throw new Error(`Value of field "${filter.field}" is not of type ${type}`);
        }
        if (typeof filter.value !== type) {
            throw new Error(`Value of filter "${filter.value}" is not of type ${type}`);
        }

        return cb(message, filter);
    }
}

const checkOnDate = (cb: FilterCb): FilterCb => {
    return (message: Message, filter: DateFilter) => {
        let targetDate: unknown = message[filter.field];
        let filterDate: unknown = filter.value;

        if (targetDate === 'string') {
            targetDate = new Date(targetDate);

            message = {
                ...message,
                [filter.field]: targetDate as Date,
            }
        }
        if (filterDate === 'string') {
            targetDate = new Date(filterDate);

            filter = {
                ...filter,
                value: targetDate as Date,
            }
        }

        if (!(targetDate instanceof Date)) {
            throw new Error(`Value of field "${filter.field}" is not of type Date`);
        }
        if (!(filterDate instanceof Date)) {
            throw new Error(`Value of filter "${filter.value}" is not of type Date`);
        }
        if (isNaN(targetDate.getTime())) {
            throw new Error(`Value of field "${filter.field}" may not be correctly coerced to type Date`);
        }
        if (isNaN(filterDate.getTime())) {
            throw new Error(`Value of filter "${filter.value}" may not be correctly coerced to type Date`);
        }

        return cb(message, filter);
    }
};

const stringTypeFilterToOperationMap: Record<StringFilter['operation'], (message: Message, filter: StringFilter) => boolean> = {
    eq: (message: Message, filter: StringFilter) => message[filter.field] === filter.value,
    startsWith: (message: Message, filter: StringFilter) => message[filter.field].toString().startsWith(filter.value),
    endsWith: (message: Message, filter: StringFilter) => message[filter.field].toString().endsWith(filter.value),
    contains: (message: Message, filter: StringFilter) => message[filter.field].toString().includes(filter.value),
};

const numberTypeFilterToOperationMap: Record<NumberFilter['operation'], (message: Message, filter: NumberFilter) => boolean> = {
    eq: (message: Message, filter: NumberFilter) => +message[filter.field] === filter.value,
    gt: (message: Message, filter: NumberFilter) => +message[filter.field] > filter.value,
    lt: (message: Message, filter: NumberFilter) => +message[filter.field] < filter.value,
    gte: (message: Message, filter: NumberFilter) => +message[filter.field] >= filter.value,
    lte: (message: Message, filter: NumberFilter) => +message[filter.field] <= filter.value,
};

const booleanTypeFilterToOperationMap: Record<BooleanFilter['operation'], (message: Message, filter: BooleanFilter) => boolean> = {
    eq: (message: Message, filter: BooleanFilter) => message[filter.field] === filter.value,
};

const dateTypeFilterToOperationMap: Record<DateFilter['operation'], (message: Message<Date>, filter: DateFilter) => boolean> = {
    eq: (message: Message<Date>, filter: DateFilter) => message[filter.field].getTime() === filter.value.getTime(),
    after: (message: Message<Date>, filter: DateFilter) => message[filter.field].getTime() > filter.value.getTime(),
    before: (message: Message<Date>, filter: DateFilter) => message[filter.field].getTime() < filter.value.getTime(),
};


const filterTypeToFilterFnMap: Record<Filter['type'], FilterCb> = {
    string: (message: Message, filter: StringFilter) => checkOnType(stringTypeFilterToOperationMap[filter.operation], 'string')(message, filter),
    number: (message: Message, filter: NumberFilter) => checkOnType(numberTypeFilterToOperationMap[filter.operation], 'number')(message, filter),
    boolean: (message: Message, filter: BooleanFilter) => checkOnType(booleanTypeFilterToOperationMap[filter.operation], 'boolean')(message, filter),
    date: (message: Message, filter: DateFilter) => checkOnDate(dateTypeFilterToOperationMap[filter.operation])(message, filter),
    or: (message: Message, filter: OrFilter) => true,
    and: (message: Message, filter: AndFilter) => true,
}

export const filterMessages = (messages: Message[], filter: Filter): Message[] => {
    return messages.filter((message: Message) => filterTypeToFilterFnMap[filter.type](message, filter as any));
}
