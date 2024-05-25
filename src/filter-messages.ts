import {
    AndFilter,
    BooleanFilter,
    DateFilter,
    Filter,
    Message,
    NumberFilter,
    OrFilter,
    PrimitiveFilter,
    StringFilter
} from "./domain";

type FilterCb = (message: Message, filter: Filter) => boolean;
type OperationCb<T> = (targetValue: T, filterValue: T) => boolean;
type Primitive = 'string' | 'number' | 'boolean';

const checkOnType = <T extends Primitive>(value: unknown, type: T, exitOnError = true): value is T => {
    if (typeof value !== type && exitOnError) {
        throw new Error(`Type of value "${value}" is not of type ${type}`);
    }
    return typeof value === type;
}

const checkOperationExist = <T extends Record<string, OperationCb<any>>>(operationType: keyof T, map: T, filterType: string): operationType is keyof T => {
    if (operationType in map) {
        return true;
    }
    throw new Error(`Operation "${operationType.toString()}" doesn't exist for "${filterType}" filter type`)
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

const stringTypeFilterToOperationMap: Record<StringFilter['operation'], OperationCb<string>> = {
    eq: (target: string, filter: string) => target === filter,
    startsWith: (target: string, filter: string) => target.startsWith(filter),
    endsWith: (target: string, filter: string) => target.endsWith(filter),
    contains: (target: string, filter: string) => target.includes(filter),
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

const getPrimitiveFilterCb = <T extends PrimitiveFilter>(filterType: T['type'], mapOfOperations: Record<T['operation'], OperationCb<any>>, exitOnError = true): FilterCb => {
    return (message: Message, filter: T) => {
        const targetValue = message[filter.field];
        const filterValue = filter.value;
        const filterOperation = filter.operation;

        if (!checkOnType(targetValue, filterType, exitOnError)) {
            return false;
        }
        if (!checkOnType(filterValue, filterType, exitOnError)) {
            return false;
        }
        if (checkOperationExist(filterOperation, mapOfOperations, filterType)) {
            return mapOfOperations[filterOperation](targetValue, filterValue);
        }
    }
}

const getFilterTypeToFilterFnMap: (exitOnError: boolean) => Record<Filter['type'], FilterCb> = (exitOnError: boolean) => ({
    string: getPrimitiveFilterCb<StringFilter>('string', stringTypeFilterToOperationMap, exitOnError),
    number: getPrimitiveFilterCb<NumberFilter>('number', numberTypeFilterToOperationMap, exitOnError),
    boolean: getPrimitiveFilterCb<BooleanFilter>('boolean', booleanTypeFilterToOperationMap, exitOnError),
    date: (message: Message, filter: DateFilter) => checkOnDate(dateTypeFilterToOperationMap[filter.operation])(message, filter),
    or: (message: Message, filter: OrFilter) => true,
    and: (message: Message, filter: AndFilter) => true,
})

export const filterMessages = (messages: Message[], filter: Filter, exitOnError = true): Message[] => {
    const filterTypeToFilterFnMap = getFilterTypeToFilterFnMap(exitOnError);

    if (exitOnError) {
        try {
            return messages.filter((message: Message) => filterTypeToFilterFnMap[filter.type](message, filter));
        } catch (error) {
            console.error(error);
            return [];
        }
    }
    return messages.filter((message: Message): boolean => {
        try {
            return filterTypeToFilterFnMap[filter.type](message, filter);
        } catch (error) {
            console.error(error)
            return false;
        }
    })
}
