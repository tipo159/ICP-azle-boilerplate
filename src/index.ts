import { $query, $update, ic, int32, float32, match, nat64, Principal, Record, Result, StableBTreeMap, Vec } from 'azle';

enum PollError {
  MaxPollsReached = "Maximum number of polls reached.",
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
  no_of_options: int32;
  options: Vec<string>;
  pollClosingAt: nat64;
  voters: Vec<Voter>;
  votingDetails: Vec<VotingDetail>;
}>;

type Voter = Record<{
  name: string;
  voter: Principal;
  contribution: float32;
}>;

type VotingDetail = Record<{
  name: string;
  option: int32;
  contribution: float32;
}>;

type PollPayload = Record<{
  name: string;
  description: string;
  no_of_options: int32;
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

  let pollClosingAt = Date.parse(payload.pollClosingDate);
  if (isNaN(pollClosingAt)) {
    return Result.Err(PollError.InvalidDateFormat);
  } else {
    pollClosingAt *= 1_000_000;
  }

  if (Polls.containsKey(payload.name)) {
    return Result.Err(PollError.PollAlreadyExists);
  }

  if (payload.no_of_options !== payload.options.length) {
    return Result.Err(PollError.OptionLengthMismatch);
  }

  const Poll: Poll = {
    owner: ic.caller(),
    pollClosingAt: BigInt(pollClosingAt),
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
        poll.voters = [];
        poll.votingDetails = [];
      }
      return Result.Ok<Poll, string>(poll);
    },
    None: () => { return Result.Err<Poll, string>(PollError.PollNotFound); },
  });
}

$query
export function getAllPolls(): Vec<Poll> {
  let polls: Poll[] = Polls.values();
  let result: Vec<Poll> = [];
  for (let index: int32 = 0; index < polls.length; index++) {
    if (polls[index].owner.toString() !== ic.caller().toString()) {
      polls[index].voters = [];
      polls[index].votingDetails = [];
    }
    result[index] = polls[index];
  }
  return result;
}

$update
export function registerVoterToPoll(pollname: string, votername: string): Result<Voter, string> {
  return match(Polls.get(pollname), {
    Some: (poll) => {
      let index = poll.voters.findIndex((elem) => elem.name === votername);
      if (index !== -1) {
        return Result.Err(VoterError.VoterAlreadyExists);
      }

      index = poll.voters.findIndex((elem) => elem.voter.toString() === ic.caller().toString());
      if (index !== -1) {
        return Result.Err(VoterError.VoterAlreadyRegistered);
      }

      let voter: Voter = {
        name: votername,
        voter: ic.caller(),
        contribution: 1.0,
      }
      poll.voters.push(voter);
      Polls.insert(pollname, poll);
      return Result.Ok<Voter, string>(voter);
    },
    None: () => { return Result.Err(VoterError.PollNotFound); },
  });
}

$update
export function changeVoterContribution(pollname: string, votername: string, contribution: float32): Result<Voter, string> {
  return match(Polls.get(pollname), {
    Some: (poll) => {
      if (poll.owner.toString() !== ic.caller().toString()) {
        return Result.Err(VoterError.CallerNotPollOwner);
      }

      let index = poll.voters.findIndex((elem) => elem.name === votername);
      if (index === -1) {
        return Result.Err(VoterError.VoterNotRegistered);
      }

      let voter = poll.voters[index];
      if (voter.voter.toString() === ic.caller().toString()) {
        return Result.Err(VoterError.OwnerCannotChangeContribution);
      }

      voter.contribution = contribution;
      poll.voters[index] = voter;
      Polls.insert(pollname, poll);
      return Result.Ok<Voter, string>(voter);
    },
    None: () => { return Result.Err(VoterError.PollNotFound); },
  });
}

$update
export function voteToPoll(pollname: string, votername: string, option: string): Result<VotingDetail, string> {
  return match(Polls.get(pollname), {
    Some: (poll) => {
      if (poll.pollClosingAt <= ic.time()) {
        return Result.Err(VotingError.VotingClosed);
      }

      let index = poll.voters.findIndex((elem) => elem.name === votername);
      if (index === -1) {
        return Result.Err(VotingError.VoterNotRegistered);
      }

      let voter = poll.voters[index];
      if (voter.voter.toString() !== ic.caller().toString()) {
        return Result.Err(VotingError.UnauthorizedVoter);
      }

      index = poll.options.findIndex((elem) => elem === option);
      if (index === -1) {
        return Result.Err(VotingError.OptionNotFound);
      }

      let votingDetails: VotingDetail = {
        name: votername,
        option: index,
        contribution: voter.contribution,
      }
      poll.votingDetails.push(votingDetails);
      Polls.insert(pollname, poll);
      return Result.Ok<VotingDetail, string>(votingDetails);
    },
    None: () => { return Result.Err(VotingError.PollNotFound); },
  });
}

$query
export function getVotingResult(name: string): Result<Vec<string>, string> {
  return match(Polls.get(name), {
    Some: (poll) => {
      if (ic.time() < poll.pollClosingAt) {
        return Result.Err(VotingError.BeforeDeadline);
      }

      let index = poll.voters.findIndex((elem) => elem.voter.toString() === ic.caller().toString());
      if (index === -1) {
        if (poll.owner.toString() !== ic.caller().toString()) {
          return Result.Err(VotingError.UnauthorizedView);
        }
      }

      let no_of_votes: float32[] = new Array(poll.no_of_options);
      no_of_votes.fill(0.0);
      poll.votingDetails.forEach((elem) => no_of_votes[elem.option] += elem.contribution);
      let results: Vec<string> = new Array(poll.no_of_options);
      for (let index = 0; index < poll.no_of_options; index++) {
        results[index] = `${poll.options[index]}: ${no_of_votes[index].toFixed(2)}`
      }
      return Result.Ok<Vec<string>, string>(results);
    },
    None: () => { return Result.Err(VotingError.PollNotFound); },
  });
}
