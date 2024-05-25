import {
    AndFilter,
    BooleanFilter,
    DateFilter, DateType,
    Filter,
    Message,
    NumberFilter,
    OrFilter,
    SimpleFilter,
    StringFilter
} from "./domain";

type FilterCb = (message: Message, filter: Filter) => boolean;
type OperationCb<T> = (targetValue: T, filterValue: T) => boolean;
type ValidationCb = (value: unknown) => boolean;

const coerceDateLikeToDateOperationCb = (cb: OperationCb<DateType>): OperationCb<Date> => (targetValue: DateType, filterValue: DateType) => {
    const targetDate = new Date(targetValue);
    const filterDate = new Date(filterValue);

    return cb(targetDate, filterDate)
}

const checkOnType = (type: unknown): ValidationCb => (value: unknown): value is typeof type => typeof value === type
const checkOperationExist = <T extends Record<string, OperationCb<any>>>(operationType: keyof T, map: T): operationType is keyof T => operationType in map;

const checkOnCorrectDate: ValidationCb = (value: unknown): boolean => {
    let _value = value;

    if (typeof _value === 'string') {
        _value = new Date(_value);
    }

    if (!(_value instanceof Date)) {
        return false;
    }
    if (isNaN(_value.getTime())) {
        return false;
    }

    return true;
};

const stringTypeFilterToOperationMap: Record<StringFilter['operation'], OperationCb<string>> = {
    eq: (target, filter) => target === filter,
    startsWith: (target, filter) => target.startsWith(filter),
    endsWith: (target, filter) => target.endsWith(filter),
    contains: (target, filter) => target.includes(filter),
};

const numberTypeFilterToOperationMap: Record<NumberFilter['operation'], OperationCb<number>> = {
    eq: (target, filter) => target === filter,
    gt: (target, filter) => target > filter,
    lt: (target, filter) => target < filter,
    gte: (target, filter) => target >= filter,
    lte: (target, filter) => target <= filter,
};

const booleanTypeFilterToOperationMap: Record<BooleanFilter['operation'], OperationCb<boolean>> = {
    eq: (target, filter) => target === filter,
};

const dateTypeFilterToOperationMap: Record<DateFilter['operation'], OperationCb<Date>> = {
    eq: coerceDateLikeToDateOperationCb((target: Date, filter: Date) => target.getTime() === filter.getTime()),
    after: coerceDateLikeToDateOperationCb((target: Date, filter: Date) => target.getTime() > filter.getTime()),
    before: coerceDateLikeToDateOperationCb((target: Date, filter: Date) => target.getTime() < filter.getTime()),
};

const getSimpleFilterCb = <T extends SimpleFilter>(filterType: T['type'], mapOfOperations: Record<T['operation'], OperationCb<any>>, validations: ValidationCb[]): FilterCb => {
    return (message: Message, filter: T) => {
        const targetValue = message[filter.field];
        const filterValue = filter.value;
        const filterOperation = filter.operation;

        if (!(validations.every(cb => cb(targetValue)))) {
            return false
        }
        if (!(validations.every(cb => cb(targetValue)))) {
            return false
        }

        if (checkOperationExist(filterOperation, mapOfOperations)) {
            return mapOfOperations[filterOperation](targetValue, filterValue);
        }
    }
}

const filterTypeToFilterFnMap: Record<Filter['type'], FilterCb> = {
    string: getSimpleFilterCb<StringFilter>('string', stringTypeFilterToOperationMap, [checkOnType('string')]),
    number: getSimpleFilterCb<NumberFilter>('number', numberTypeFilterToOperationMap, [checkOnType('number')]),
    boolean: getSimpleFilterCb<BooleanFilter>('boolean', booleanTypeFilterToOperationMap, [checkOnType('boolean')]),
    date: getSimpleFilterCb<DateFilter>('date', dateTypeFilterToOperationMap, [checkOnCorrectDate]),
    or: (message: Message, filter: OrFilter) => true,
    and: (message: Message, filter: AndFilter) => true,
};

export const filterMessages = (messages: Message[], filter: Filter): Message[] =>
    messages.filter((message) => filterTypeToFilterFnMap[filter.type](message, filter))
