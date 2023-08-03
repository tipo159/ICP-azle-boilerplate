import { $query, $update, ic, Principal, Record, Result, StableBTreeMap, Vec } from 'azle';

type Poll = Record<{
    name: string;
    owner: Principal;
    description: string;
    no_of_options: number;
    options: Vec<string>;
    pollClosingAt: bigint;
    voters: Vec<Voter>;
    votingDetails: Vec<VotingDetail>;
}>;

type Voter = Record<{
    name: string;
    voter: Principal;
    contribution: number;
}>;

type VotingDetail = Record<{
    name: string;
    option: number;
    contribution: number;
}>;

type PollPayload = Record<{
    name: string;
    description: string;
    no_of_options: number;
    options: Vec<string>;
    pollClosing: string;
}>;

// MAX_POLLS is set to 3 to facilitate testing.
const MAX_POLLS = BigInt(3);

let Polls = new StableBTreeMap<string, Poll>(0, 100, 1000);

$update;
export function createPoll(payload: PollPayload): Result<Poll, string> {
    if (Polls.len() === MAX_POLLS) {
        return Result.Err("Maximum number of polls reached.");
    }

    const pollClosingAt = BigInt(parseDate(payload.pollClosing));
    if (pollClosingAt <= BigInt(Date.now())) {
        return Result.Err(`Poll closing time must be in the future.`);
    }

    if (Polls.containsKey(payload.name)) {
        return Result.Err(`Poll '${payload.name}' is already in use.`);
    }

    if (payload.no_of_options !== payload.options.length) {
        return Result.Err("The length of options and no_of_options are different.");
    }

    const poll: Poll = {
        owner: ic.caller(),
        pollClosingAt,
        voters: [],
        votingDetails: [],
        ...payload
    };
    const _ = Polls.insert(payload.name, poll);
    return Result.Ok<Poll, string>(poll);
}

$query;
export function getPollByName(name: string): Result<Poll, string> {
    const poll = Polls.get(name);
    if (poll) {
        if (poll.owner.toString() !== ic.caller().toString()) {
            // Hide voters and voting details for non-owners
            return Result.Ok<Poll, string>({ ...poll, voters: [], votingDetails: [] });
        }
        return Result.Ok<Poll, string>(poll);
    }
    return Result.Err<Poll, string>(`Poll '${name}' not found.`);
}

$query;
export function getAllPolls(): Vec<Poll> {
    const callerPrincipal = ic.caller().toString();
    const polls = Polls.values().map((poll) => {
        if (poll.owner.toString() !== callerPrincipal) {
            // Hide voters and voting details for non-owners
            return { ...poll, voters: [], votingDetails: [] };
        }
        return poll;
    });
    return polls;
}

$update;
export function registerVoterToPoll(pollname: string, votername: string): Result<Voter, string> {
    const poll = Polls.get(pollname);
    if (poll) {
        const voterIndex = poll.voters.findIndex((elem) => elem.name === votername);
        if (voterIndex !== -1) {
            return Result.Err<Voter, string>(`Voter '${votername}' is already in use.`);
        }

        const callerPrincipal = ic.caller().toString();
        const callerIndex = poll.voters.findIndex((elem) => elem.voter.toString() === callerPrincipal);
        if (callerIndex !== -1) {
            return Result.Err<Voter, string>(`Voter '${callerPrincipal}' is already registered.`);
        }

        const voter: Voter = {
            name: votername,
            voter: ic.caller(),
            contribution: 1.0,
        };
        poll.voters.push(voter);
        const _ = Polls.insert(pollname, poll);
        return Result.Ok<Voter, string>(voter);
    }
    return Result.Err<Voter, string>(`Poll '${pollname}' not found.`);
}

$update;
export function changeVoterContribution(
    pollname: string,
    votername: string,
    contribution: number
): Result<Voter, string> {
    const poll = Polls.get(pollname);
    if (poll) {
        if (poll.owner.toString() !== ic.caller().toString()) {
            return Result.Err<Voter, string>(`Caller is not the owner of the poll '${pollname}'.`);
        }

        const voterIndex = poll.voters.findIndex((elem) => elem.name === votername);
        if (voterIndex === -1) {
            return Result.Err<Voter, string>(`Voter '${votername}' not found.`);
        }

        const voter = poll.voters[voterIndex];
        if (voter.voter.toString() === ic.caller().toString()) {
            return Result.Err<Voter, string>("The owner of the poll cannot change their own contribution.");
        }

        voter.contribution = contribution;
        poll.voters[voterIndex] = voter;
        Polls.insert(pollname, poll);
        return Result.Ok<Voter, string>(voter);
    }
    return Result.Err<Voter, string>(`Poll '${pollname}' not found.`);
}

$update;
export function voteToPoll(pollname: string, votername: string, option: string): Result<VotingDetail, string> {
    const poll = Polls.get(pollname);
    if (poll) {
        if (poll.pollClosingAt <= BigInt(Date.now())) {
            return Result.Err<VotingDetail, string>("Voting is closed.");
        }

        const voterIndex = poll.voters.findIndex((elem) => elem.name === votername);
        if (voterIndex === -1) {
            return Result.Err<VotingDetail, string>(`Voter '${votername}' not found.`);
        }

        const callerPrincipal = ic.caller().toString();
        if (poll.voters[voterIndex].voter.toString() !== callerPrincipal) {
            return Result.Err<VotingDetail, string>("The registered principal and voter's principal are different.");
        }

        const optionIndex = poll.options.findIndex((elem) => elem === option);
        if (optionIndex === -1) {
            return Result.Err<VotingDetail, string>(`Option '${option}' not found.`);
        }

        const votingDetails: VotingDetail = {
            name: votername,
            option: optionIndex,
            contribution: poll.voters[voterIndex].contribution,
        };
        poll.votingDetails.push(votingDetails);
        Polls.insert(pollname, poll);
        return Result.Ok<VotingDetail, string>(votingDetails);
    }
    return Result.Err<VotingDetail, string>(`Poll '${pollname}' not found.`);
}

$query;
export function getVotingResult(name: string): Result<Vec<string>, string> {
    const poll = Polls.get(name);
    if (poll) {
        if (poll.pollClosingAt <= BigInt(Date.now())) {
            const no_of_votes: number[] = new Array(poll.no_of_options);
            no_of_votes.fill(0);
            poll
