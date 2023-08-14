import { $query, $update, ic, int32, float32, match, Principal, Record, Result, StableBTreeMap, Vec } from 'azle';

// MAX_POLLS is set to 3 to facilitate testing.
const MAX_POLLS = BigInt(3);

enum PollError {
  TooManyPolls = "Too many polls created.",
  InvalidDate = "Date format is invalid.",
  PollClosingTimeMustFuture = "Poll closing time must be in the future.",
  PollInUse = "Poll already in use.",
  PollNotExist = "Poll does not exist.",
  VoterInUse = "Voter already in use.",
  VoterPrincipalInUse = "Voter principal already in use.",
  VoterNotExist = "Voter does not exist.",
  VoterNotAuthorized = "Voter is not authorized.",
  CallerNotPollOwner = "Caller is not the poll owner.",
  PollOwnerCannotChangeContribution = "Poll owner cannot change own contribution.",
  OptionNotExist = "Option does not exist.",
  VotingIsOver = "Voting is over.",
  OnlyVoterAndPollOwnerCanViewResults = "Only the voter and the poll owner can view voting results.",
  VotingNotClosed = "Voting is not closed.",
}

type Poll = Record<{
  name: string;
  owner: Principal;
  description: string;
  options: Vec<string>;
  pollClosingDate: string;
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
  options: Vec<string>;
  pollClosingDate: string;
}>;

let Polls = new StableBTreeMap<string, Poll>(0, 100, 1000);

$update
export function createPoll(payload: PollPayload): Result<Poll, string> {
  if (Polls.len() === MAX_POLLS) {
    return Result.Err<Poll, string>(PollError.TooManyPolls);
  }

  let pollClosingAt = Date.parse(payload.pollClosingDate);
  if (isNaN(pollClosingAt)) {
    return Result.Err<Poll, string>(PollError.InvalidDate);
  } else {
    pollClosingAt *= 1_000_000;
    if (pollClosingAt <= ic.time()) {
      return Result.Err<Poll, string>(PollError.PollClosingTimeMustFuture);
    }
  }

  if (Polls.containsKey(payload.name)) {
    return Result.Err<Poll, string>(PollError.PollInUse);
  }

  const Poll: Poll = {
    owner: ic.caller(),
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
        return Result.Ok<Poll, string>({...poll, voters: [], votingDetails: []});
      }
      return Result.Ok<Poll, string>(poll);
    },
    None: () => { return Result.Err<Poll, string>(PollError.PollNotExist); },
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
  return match(Polls.get(pollname), {
    Some: (poll) => {
      let index = poll.voters.findIndex((elem) => elem.name === votername);
      if (index !== -1) {
        return Result.Err<Voter, string>(PollError.VoterInUse);
      }

      index = poll.voters.findIndex((elem) => elem.voter.toString() === ic.caller().toString());
      if (index !== -1) {
        return Result.Err<Voter, string>(PollError.VoterPrincipalInUse);
      }

      const voter: Voter = {
        name: votername,
        voter: ic.caller(),
        contribution: 1.0,
      }
      poll.voters.push(voter);
      Polls.insert(pollname, poll);
      return Result.Ok<Voter, string>(voter);
    },
    None: () => { return Result.Err<Voter, string>(PollError.PollNotExist); },
  });
}

$update
export function changeVoterContribution(pollname: string, votername: string, contribution: float32): Result<Voter, string> {
  return match(Polls.get(pollname), {
    Some: (poll) => {
      if (poll.owner.toString() !== ic.caller().toString()) {
        return Result.Err<Voter, string>(PollError.CallerNotPollOwner);
      }

      let index = poll.voters.findIndex((elem) => elem.name === votername);
      if (index === -1) {
        return Result.Err<Voter, string>(PollError.VoterNotExist);
      }

      let voter = poll.voters[index];
      if (voter.voter.toString() === ic.caller().toString()) {
        return Result.Err<Voter, string>(PollError.PollOwnerCannotChangeContribution);
      }

      voter.contribution = contribution;
      poll.voters[index] = voter;
      Polls.insert(pollname, poll);
      return Result.Ok<Voter, string>(voter);
    },
    None: () => { return Result.Err<Voter, string>(PollError.PollNotExist); },
  });
}

$update
export function voteToPoll(pollname: string, votername: string, option: string): Result<VotingDetail, string> {
  return match(Polls.get(pollname), {
    Some: (poll) => {
      let pollClosingAt = Date.parse(poll.pollClosingDate);
      // Confirmed that parse_from_rfc3339 succeeds in createPoll
      pollClosingAt *= 1_000_000;
      if (pollClosingAt <= ic.time()) {
        return Result.Err<VotingDetail, string>(PollError.VotingIsOver);
      }

      let index = poll.voters.findIndex((elem) => elem.name === votername);
      if (index === -1) {
        return Result.Err<VotingDetail, string>(PollError.VoterNotExist);
      }

      let voter = poll.voters[index];
      if (voter.voter.toString() !== ic.caller().toString()) {
        return Result.Err<VotingDetail, string>(PollError.VoterNotAuthorized);
      }

      index = poll.options.findIndex((elem) => elem === option);
      if (index === -1) {
        return Result.Err<VotingDetail, string>(PollError.OptionNotExist);
      }

      const votingDetails: VotingDetail = {
        name: votername,
        option: index,
        contribution: voter.contribution,
      }
      poll.votingDetails.push(votingDetails);
      Polls.insert(pollname, poll);
      return Result.Ok<VotingDetail, string>(votingDetails);
    },
    None: () => { return Result.Err<VotingDetail, string>(PollError.PollNotExist); },
  });
}

$query
export function getVotingResult(name: string): Result<Vec<string>, string> {
  return match(Polls.get(name), {
    Some: (poll) => {
      let pollClosingAt = Date.parse(poll.pollClosingDate);
      // Confirmed that parse_from_rfc3339 succeeds in createPoll
      pollClosingAt *= 1_000_000;
      if (ic.time() < pollClosingAt) {
        return Result.Err<Vec<string>, string>(PollError.VotingNotClosed);
      }

      let index = poll.voters.findIndex((elem) => elem.voter.toString() === ic.caller().toString());
      if (index === -1) {
        if (poll.owner.toString() !== ic.caller().toString()) {
          return Result.Err<Vec<string>, string>(PollError.OnlyVoterAndPollOwnerCanViewResults);
        }
      }

      let no_of_votes: float32[] = new Array(poll.options.length);
      no_of_votes.fill(0.0);
      poll.votingDetails.forEach((elem) => no_of_votes[elem.option] += elem.contribution);
      let results: Vec<string> = new Array(poll.options.length);
      for (let index = 0; index < poll.options.length; index++) {
        results[index] = `${poll.options[index]}: ${no_of_votes[index].toFixed(2)}`
      }
      return Result.Ok<Vec<string>, string>(results);
    },
    None: () => { return Result.Err<Vec<string>, string>(PollError.PollNotExist); },
  });
}

$update
export function removeExpiredPolls(overTime: int32): Vec<Poll> {
  let polls: Vec<Poll> = new Array();
  for (const poll of Polls.values()) {
    let pollClosingAt = Date.parse(poll.pollClosingDate);
    // Confirmed that parse_from_rfc3339 succeeds in createPoll
    pollClosingAt *= 1_000_000;
    if ((pollClosingAt + overTime * 1_000_000_000) <= ic.time()) {
      Polls.remove(poll.name);
      polls.push(poll);
    }
  }
  return polls;
}
