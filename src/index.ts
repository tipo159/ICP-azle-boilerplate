import { $query, $update, ic, int32, float32, match, nat64, Principal, Record, Result, StableBTreeMap, Vec } from 'azle';

enum PollError {
  MaxPollsReached = "Maximum number of polls reached.",
  PollClosingTimeMustFuture = "Poll closing time must be in the future.",
  InvalidDateFormat = "Date formatting is invalid.",
  PollAlreadyExists = "Poll already in use.",
  OptionLengthMismatch = "The length of options and no_of_options are different.",
  PollNotFound = "Poll not found.",
  VoterAlreadyExists = "Voter already in use.",
  VoterNotRegistered = "Voter not found.",
  CallerNotPollOwner = "Caller is not the owner of the poll.",
  OwnerCannotChangeContribution = "The owner of the poll cannot change their own contribution.",
  OptionNotFound = "Option not found.",
  VotingClosed = "Voting is closed.",
  UnauthorizedView = "Only the voter and the owner of the poll can see voting results.",
  BeforeDeadline = "It's before the voting deadline.",
}

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
  pollClosingDate: string;
}>;

// MAX_POLLS is set to 3 to facilitate testing.
const MAX_POLLS = BigInt(3);

let Polls = new StableBTreeMap<string, Poll>(0, 100, 1000);

$update
export function createPoll(payload: PollPayload): Result<Poll, string> {
  if (Polls.len() === MAX_POLLS) {
    return Result.Err(PollError.MaxPollsReached);
  }

  const pollClosingAt = BigInt(parseDate(payload.pollClosing));
  if (pollClosingAt <= BigInt(Date.now())) {
    return Result.Err(PollErrr.PollClosingTimeMustFuture);
  }

  if (Polls.containsKey(payload.name)) {
    return Result.Err(PollError.PollAlreadyExists);
  }

  if (payload.no_of_options !== payload.options.length) {
    return Result.Err(PollError.OptionLengthMismatch);
  }

  const Poll: Poll = {
    owner: ic.caller(),
    pollClosingAt,
    voters: [],
    votingDetails: [],
    ...payload
  };
  const _ = Polls.insert(payload.name, Poll);
  return Result.Ok<Poll, string>(Poll);
}

$query
export function getPollByName(name: string): Result<Poll, string> {
  return match(Polls.get(name), {
    Some: (poll) => {
      if (poll.owner.toString() !== ic.caller().toString()) {
        // Hide voters and voting details for non-owners
        return Result.Ok<Poll, string>({ ...poll, voters: [], votingDetails: [] });
      }
      return Result.Ok<Poll, string>(poll);
    },
    None: () => { return Result.Err<Poll, string>(PollError.PollNotFound); },
  });
}

$query
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

$update
export function registerVoterToPoll(pollname: string, votername: string): Result<Voter, string> {
  const poll = Polls.get(pollname);
  if (poll) {
    const voterIndex = poll.voters.findIndex((elem) => elem.name === votername);
    if (voterIndex !== -1) {
      return Result.Err(VoterError.VoterAlreadyExists);
    }

    const callerPrincipal = ic.caller().toString();
    const callerIndex = poll.voters.findIndex((elem) => elem.voter.toString() === callerPrincipal);
    if (callerIndex !== -1) {
      return Result.Err(VoterError.VoterAlreadyRegistered);
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
  return Result.Err(VoterError.PollNotFound);
}

$update
export function changeVoterContribution(pollname: string, votername: string, contribution: float32): Result<Voter, string> {
  const poll = Polls.get(pollname);
  if (poll) {
    if (poll.owner.toString() !== ic.caller().toString()) {
      return Result.Err(VoterError.CallerNotPollOwner);
    }

    const voterIndex = poll.voters.findIndex((elem) => elem.name === votername);
    if (voterIndex === -1) {
      return Result.Err(VoterError.VoterNotRegistered);
    }

    const voter = poll.voters[voterIndex];
    if (voter.voter.toString() === ic.caller().toString()) {
      return Result.Err(VoterError.OwnerCannotChangeContribution);
    }

    voter.contribution = contribution;
    poll.voters[voterIndex] = voter;
    Polls.insert(pollname, poll);
    return Result.Ok<Voter, string>(voter);
  }
  return Result.Err(VoterError.PollNotFound);
}

$update
export function voteToPoll(pollname: string, votername: string, option: string): Result<VotingDetail, string> {
  const poll = Polls.get(pollname);
  if (poll) {
    if (poll.pollClosingAt <= BigInt(Date.now())) {
      return Result.Err(VotingError.VotingClosed);
    }

    const voterIndex = poll.voters.findIndex((elem) => elem.name === votername);
    if (voterIndex === -1) {
      return Result.Err(VotingError.VoterNotRegistered);
    }

    const callerPrincipal = ic.caller().toString();
    if (poll.voters[voterIndex].voter.toString() !== callerPrincipal) {
      return Result.Err(VotingError.UnauthorizedVoter);
    }

    const optionIndex = poll.options.findIndex((elem) => elem === option);
    if (optionIndex === -1) {
      return Result.Err(VotingError.OptionNotFound);
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
  return Result.Err(VotingError.PollNotFound);
}

$query
export function getVotingResult(name: string): Result<Vec<string>, string> {
  const poll = Polls.get(name);
  if (poll) {
    if (BigInt(Date.now()) < poll.pollClosingAt) {
        return Result.Err(VotingError.BeforeDeadline);
      }

    let index = poll.voters.findIndex((elem) => elem.voter.toString() === ic.caller().toString());
    if (index === -1) {
      if (poll.owner.toString() !== ic.caller().toString()) {
        return Result.Err(VotingError.UnauthorizedView);
      }
    }

    let no_of_votes: number[] = new Array(poll.no_of_options);
    no_of_votes.fill(0.0);
    poll.votingDetails.forEach((elem) => no_of_votes[elem.option] += elem.contribution);
    let results: Vec<string> = new Array(poll.no_of_options);
    for (let index = 0; index < poll.no_of_options; index++) {
      results[index] = `${poll.options[index]}: ${no_of_votes[index].toFixed(2)}`
    }
    return Result.Ok<Vec<string>, string>(results);
  }
  return Result.Err(VotingError.PollNotFound);
}
